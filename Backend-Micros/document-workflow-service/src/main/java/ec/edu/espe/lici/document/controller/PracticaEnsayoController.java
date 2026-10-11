package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.PracticaEnsayo;
import ec.edu.espe.lici.document.repository.PracticaEnsayoRepository;
import ec.edu.espe.lici.document.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

/**
 * Registro del desarrollo de practicas y ensayos del laboratorio. Cualquier
 * usuario autenticado puede listar, ver y crear (quedando como responsable);
 * editar, subir archivo o eliminar una practica concreta solo lo puede hacer
 * su responsable o el ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/practicas")
public class PracticaEnsayoController {

    private final PracticaEnsayoRepository repository;
    private final Path storageDir;

    public PracticaEnsayoController(PracticaEnsayoRepository repository,
                                     @Value("${lici.storage.practicas-dir}") String storageDir) {
        this.repository = repository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<PracticaEnsayo> listar() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public PracticaEnsayo obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<PracticaEnsayo> crear(@Valid @RequestBody PracticaEnsayo request) {
        request.setId(null);
        if (!CurrentUser.isAdministrador() || request.getResponsableId() == null) {
            request.setResponsableId(CurrentUser.id());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(request));
    }

    @PutMapping("/{id}")
    public PracticaEnsayo actualizar(@PathVariable Long id, @Valid @RequestBody PracticaEnsayo request) {
        PracticaEnsayo practica = buscar(id);
        verificarPropiedad(practica);

        practica.setTitulo(request.getTitulo());
        practica.setFecha(request.getFecha());
        practica.setDescripcion(request.getDescripcion());
        if (CurrentUser.isAdministrador() && request.getResponsableId() != null) {
            practica.setResponsableId(request.getResponsableId());
        }
        return repository.save(practica);
    }

    /** Sube (o reemplaza) el documento de respaldo de la practica/ensayo. */
    @PostMapping(value = "/{id}/archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PracticaEnsayo subirArchivo(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        PracticaEnsayo practica = buscar(id);
        verificarPropiedad(practica);
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        String nombreAlmacenado = "practica-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        practica.setArchivoRuta(nombreAlmacenado);
        practica.setArchivoNombreArchivo(archivo.getOriginalFilename());
        practica.setArchivoContentType(archivo.getContentType());
        return repository.save(practica);
    }

    /** Sirve el documento de respaldo para previsualizacion/descarga. */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        PracticaEnsayo practica = buscar(id);
        if (practica.getArchivoRuta() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Esta practica no tiene un archivo cargado");
        }
        Path archivo = storageDir.resolve(practica.getArchivoRuta());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }
        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = practica.getArchivoContentType() != null
                ? MediaType.parseMediaType(practica.getArchivoContentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = practica.getArchivoNombreArchivo() != null ? practica.getArchivoNombreArchivo() : "practica.pdf";
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        PracticaEnsayo practica = buscar(id);
        verificarPropiedad(practica);
        repository.delete(practica);
        return ResponseEntity.noContent().build();
    }

    private PracticaEnsayo buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Practica/ensayo no encontrado"));
    }

    private void verificarPropiedad(PracticaEnsayo practica) {
        if (!CurrentUser.isAdministrador() && !practica.getResponsableId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el responsable de esta practica (o el Jefe de Laboratorio) puede editarla");
        }
    }

    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }
}

package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.PlanificacionEstrategica;
import ec.edu.espe.lici.document.repository.PlanificacionEstrategicaRepository;
import ec.edu.espe.lici.document.security.CurrentUser;
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
 * Documentos de planificacion estrategica del laboratorio (PDFs). Cualquier
 * usuario autenticado puede listar y descargar; cargar, editar y eliminar es
 * exclusivo del ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/planificacion-estrategica")
public class PlanificacionEstrategicaController {

    private final PlanificacionEstrategicaRepository planificacionEstrategicaRepository;
    private final Path storageDir;

    public PlanificacionEstrategicaController(PlanificacionEstrategicaRepository planificacionEstrategicaRepository,
                                               @Value("${lici.storage.planificacion-dir}") String storageDir) {
        this.planificacionEstrategicaRepository = planificacionEstrategicaRepository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<PlanificacionEstrategica> listar() {
        return planificacionEstrategicaRepository.findAll();
    }

    /** Crea el documento y guarda su archivo en un solo paso (siempre requiere archivo). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PlanificacionEstrategica> crear(@RequestParam String titulo,
                                                           @RequestParam(required = false) String descripcion,
                                                           @RequestParam("archivo") MultipartFile archivo) throws IOException {
        exigirAdministrador();
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }

        PlanificacionEstrategica documento = PlanificacionEstrategica.builder()
                .titulo(titulo)
                .descripcion(descripcion)
                .usuarioId(CurrentUser.id())
                .build();
        documento = planificacionEstrategicaRepository.save(documento);

        guardarArchivo(documento, archivo);
        documento = planificacionEstrategicaRepository.save(documento);

        return ResponseEntity.status(HttpStatus.CREATED).body(documento);
    }

    /** Edita titulo/descripcion y, opcionalmente, reemplaza el archivo. */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PlanificacionEstrategica actualizar(@PathVariable Long id,
                                                @RequestParam String titulo,
                                                @RequestParam(required = false) String descripcion,
                                                @RequestParam(value = "archivo", required = false) MultipartFile archivo) throws IOException {
        exigirAdministrador();
        PlanificacionEstrategica documento = buscar(id);

        documento.setTitulo(titulo);
        documento.setDescripcion(descripcion);
        documento.setUsuarioId(CurrentUser.id());

        if (archivo != null && !archivo.isEmpty()) {
            guardarArchivo(documento, archivo);
        }

        return planificacionEstrategicaRepository.save(documento);
    }

    /** Sirve el archivo para previsualizacion/descarga (inline, respeta el Content-Type original). */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        PlanificacionEstrategica documento = buscar(id);

        if (documento.getRutaArchivo() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El documento no tiene un archivo cargado");
        }
        Path archivo = storageDir.resolve(documento.getRutaArchivo());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }

        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = documento.getContentType() != null
                ? MediaType.parseMediaType(documento.getContentType())
                : MediaType.APPLICATION_PDF;
        String nombre = documento.getNombreArchivo() != null ? documento.getNombreArchivo() : "planificacion-estrategica.pdf";
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        exigirAdministrador();
        PlanificacionEstrategica documento = buscar(id);
        planificacionEstrategicaRepository.delete(documento);
        return ResponseEntity.noContent().build();
    }

    private void guardarArchivo(PlanificacionEstrategica documento, MultipartFile archivo) throws IOException {
        String nombreAlmacenado = "planificacion-" + documento.getId() + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        documento.setRutaArchivo(nombreAlmacenado);
        documento.setNombreArchivo(archivo.getOriginalFilename());
        documento.setContentType(archivo.getContentType());
    }

    private void exigirAdministrador() {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo un administrador puede modificar la planificacion estrategica");
        }
    }

    private PlanificacionEstrategica buscar(Long id) {
        return planificacionEstrategicaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
    }

    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }
}

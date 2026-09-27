package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.ManualProceso;
import ec.edu.espe.lici.document.repository.ManualProcesoRepository;
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
 * Biblioteca de manuales, procesos y procedimientos del laboratorio (PDFs).
 * Cualquier usuario autenticado puede listar y descargar; cargar, editar y
 * eliminar es exclusivo del ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/manuales")
public class ManualProcesoController {

    private final ManualProcesoRepository manualProcesoRepository;
    private final Path storageDir;

    public ManualProcesoController(ManualProcesoRepository manualProcesoRepository,
                                    @Value("${lici.storage.manuales-dir}") String storageDir) {
        this.manualProcesoRepository = manualProcesoRepository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<ManualProceso> listar() {
        return manualProcesoRepository.findAll();
    }

    /** Crea el manual y guarda su archivo en un solo paso (siempre requiere archivo). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ManualProceso> crear(@RequestParam String titulo,
                                                @RequestParam(required = false) String descripcion,
                                                @RequestParam("archivo") MultipartFile archivo) throws IOException {
        exigirAdministrador();
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }

        ManualProceso manual = ManualProceso.builder()
                .titulo(titulo)
                .descripcion(descripcion)
                .usuarioId(CurrentUser.id())
                .build();
        manual = manualProcesoRepository.save(manual);

        guardarArchivo(manual, archivo);
        manual = manualProcesoRepository.save(manual);

        return ResponseEntity.status(HttpStatus.CREATED).body(manual);
    }

    /** Edita titulo/descripcion y, opcionalmente, reemplaza el archivo. */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ManualProceso actualizar(@PathVariable Long id,
                                     @RequestParam String titulo,
                                     @RequestParam(required = false) String descripcion,
                                     @RequestParam(value = "archivo", required = false) MultipartFile archivo) throws IOException {
        exigirAdministrador();
        ManualProceso manual = buscar(id);

        manual.setTitulo(titulo);
        manual.setDescripcion(descripcion);
        manual.setUsuarioId(CurrentUser.id());

        if (archivo != null && !archivo.isEmpty()) {
            guardarArchivo(manual, archivo);
        }

        return manualProcesoRepository.save(manual);
    }

    /** Sirve el archivo para previsualizacion/descarga (inline, respeta el Content-Type original). */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        ManualProceso manual = buscar(id);

        if (manual.getRutaArchivo() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El manual no tiene un archivo cargado");
        }
        Path archivo = storageDir.resolve(manual.getRutaArchivo());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }

        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = manual.getContentType() != null
                ? MediaType.parseMediaType(manual.getContentType())
                : MediaType.APPLICATION_PDF;
        String nombre = manual.getNombreArchivo() != null ? manual.getNombreArchivo() : "manual.pdf";
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        exigirAdministrador();
        ManualProceso manual = buscar(id);
        manualProcesoRepository.delete(manual);
        return ResponseEntity.noContent().build();
    }

    private void guardarArchivo(ManualProceso manual, MultipartFile archivo) throws IOException {
        String nombreAlmacenado = "manual-" + manual.getId() + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        manual.setRutaArchivo(nombreAlmacenado);
        manual.setNombreArchivo(archivo.getOriginalFilename());
        manual.setContentType(archivo.getContentType());
    }

    private void exigirAdministrador() {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo un administrador puede modificar los manuales y procesos");
        }
    }

    private ManualProceso buscar(Long id) {
        return manualProcesoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manual no encontrado"));
    }

    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }
}

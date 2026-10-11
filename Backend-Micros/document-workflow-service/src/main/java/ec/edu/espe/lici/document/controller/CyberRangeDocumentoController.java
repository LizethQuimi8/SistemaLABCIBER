package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.CyberRangeDocumento;
import ec.edu.espe.lici.document.repository.CyberRangeDocumentoRepository;
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
 * Biblioteca de documentos del CyberRange (guias, topologias, manuales de
 * escenarios). Cualquier usuario autenticado puede listar y descargar;
 * cargar, editar y eliminar es exclusivo del ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/cyberrange")
public class CyberRangeDocumentoController {

    private final CyberRangeDocumentoRepository repository;
    private final Path storageDir;

    public CyberRangeDocumentoController(CyberRangeDocumentoRepository repository,
                                          @Value("${lici.storage.cyberrange-dir}") String storageDir) {
        this.repository = repository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<CyberRangeDocumento> listar() {
        return repository.findAll();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CyberRangeDocumento> crear(@RequestParam String titulo,
                                                      @RequestParam(required = false) String descripcion,
                                                      @RequestParam("archivo") MultipartFile archivo) throws IOException {
        exigirAdministrador();
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }

        CyberRangeDocumento documento = CyberRangeDocumento.builder()
                .titulo(titulo)
                .descripcion(descripcion)
                .usuarioId(CurrentUser.id())
                .build();
        documento = repository.save(documento);

        guardarArchivo(documento, archivo);
        documento = repository.save(documento);

        return ResponseEntity.status(HttpStatus.CREATED).body(documento);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CyberRangeDocumento actualizar(@PathVariable Long id,
                                           @RequestParam String titulo,
                                           @RequestParam(required = false) String descripcion,
                                           @RequestParam(value = "archivo", required = false) MultipartFile archivo) throws IOException {
        exigirAdministrador();
        CyberRangeDocumento documento = buscar(id);

        documento.setTitulo(titulo);
        documento.setDescripcion(descripcion);
        documento.setUsuarioId(CurrentUser.id());

        if (archivo != null && !archivo.isEmpty()) {
            guardarArchivo(documento, archivo);
        }

        return repository.save(documento);
    }

    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        CyberRangeDocumento documento = buscar(id);

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
                : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = documento.getNombreArchivo() != null ? documento.getNombreArchivo() : "cyberrange.pdf";
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        exigirAdministrador();
        CyberRangeDocumento documento = buscar(id);
        repository.delete(documento);
        return ResponseEntity.noContent().build();
    }

    private void guardarArchivo(CyberRangeDocumento documento, MultipartFile archivo) throws IOException {
        String nombreAlmacenado = "cyberrange-" + documento.getId() + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
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
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el Jefe de Laboratorio puede modificar los documentos del CyberRange");
        }
    }

    private CyberRangeDocumento buscar(Long id) {
        return repository.findById(id)
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

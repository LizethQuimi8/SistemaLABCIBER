package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Documento;
import ec.edu.espe.lici.document.repository.DocumentoRepository;
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
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * Repositorio compartido de documentos y correspondencia (memorandos,
 * informes, otros): cualquier usuario autenticado puede ver, cargar, subir
 * el archivo y editar los metadatos de cualquier documento. Eliminar es
 * exclusivo de ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    private final DocumentoRepository documentoRepository;
    private final Path storageDir;

    public DocumentoController(DocumentoRepository documentoRepository,
                                @Value("${lici.storage.documentos-dir}") String storageDir) {
        this.documentoRepository = documentoRepository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<Documento> listar() {
        return documentoRepository.findAll();
    }

    @GetMapping("/{id}")
    public Documento obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<Documento> crear(@Valid @RequestBody Documento documento) {
        documento.setId(null);
        documento.setUsuarioId(CurrentUser.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(documentoRepository.save(documento));
    }

    @PutMapping("/{id}")
    public Documento actualizar(@PathVariable Long id, @Valid @RequestBody Documento request) {
        Documento documento = buscar(id);

        documento.setTitulo(request.getTitulo());
        documento.setTipo(request.getTipo());
        documento.setFirmanteId(request.getFirmanteId());
        documento.setEstado(request.getEstado());
        return documentoRepository.save(documento);
    }

    /** Sube (o reemplaza) el archivo binario de un documento ya creado. */
    @PostMapping(value = "/{id}/archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Documento subirArchivo(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Documento documento = buscar(id);

        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }

        String nombreAlmacenado = "doc-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }

        documento.setRutaArchivo(nombreAlmacenado);
        documento.setNombreArchivo(archivo.getOriginalFilename());
        documento.setContentType(archivo.getContentType());
        documento.setHashArchivo(sha256(destino));
        documento.setVersion((documento.getVersion() == null ? 0 : documento.getVersion()) + 1);
        return documentoRepository.save(documento);
    }

    /** Sirve el archivo para previsualizacion/descarga (inline, respeta el Content-Type original). */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        Documento documento = buscar(id);

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
        String nombre = documento.getNombreArchivo() != null ? documento.getNombreArchivo() : nombreAlmacenadoFallback(documento);
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo un administrador puede eliminar documentos");
        }
        Documento documento = buscar(id);
        documentoRepository.delete(documento);
        return ResponseEntity.noContent().build();
    }

    private Documento buscar(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
    }

    private String nombreAlmacenadoFallback(Documento documento) {
        return documento.getRutaArchivo() != null ? documento.getRutaArchivo() : "archivo";
    }

    /** Extension del nombre original, saneada (solo alfanumerica, max 10 caracteres) para evitar path traversal. */
    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }

    private String sha256(Path archivo) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(Files.readAllBytes(archivo));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}

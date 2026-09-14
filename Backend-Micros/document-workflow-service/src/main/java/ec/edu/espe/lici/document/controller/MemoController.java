package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Memo;
import ec.edu.espe.lici.document.repository.MemoRepository;
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

@RestController
@RequestMapping("/api/memos")
public class MemoController {

    private final MemoRepository memoRepository;
    private final Path storageDir;

    public MemoController(MemoRepository memoRepository,
                           @Value("${lici.storage.documentos-dir}") String storageDir) {
        this.memoRepository = memoRepository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<Memo> listar() {
        if (CurrentUser.isAdministrador()) {
            return memoRepository.findAll();
        }
        Long userId = CurrentUser.id();
        return memoRepository.findByRemitenteIdOrDestinatarioId(userId, userId);
    }

    @GetMapping("/{id}")
    public Memo obtener(@PathVariable Long id) {
        Memo memo = buscar(id);
        verificarPropiedad(memo);
        return memo;
    }

    @PostMapping
    public ResponseEntity<Memo> crear(@Valid @RequestBody Memo memo) {
        if (!CurrentUser.isAdministrador()) {
            memo.setRemitenteId(CurrentUser.id());
        }
        memo.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(memoRepository.save(memo));
    }

    @PatchMapping("/{id}/estado")
    public Memo actualizarEstado(@PathVariable Long id, @RequestParam ec.edu.espe.lici.document.domain.EstadoMemo estado) {
        Memo memo = buscar(id);
        verificarPropiedad(memo);
        memo.setEstado(estado);
        return memoRepository.save(memo);
    }

    /** Sube (o reemplaza) el archivo adjunto de un memo ya creado. */
    @PostMapping(value = "/{id}/archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Memo subirArchivo(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Memo memo = buscar(id);
        verificarPropiedad(memo);

        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }

        String nombreAlmacenado = "memo-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }

        memo.setRutaArchivo(nombreAlmacenado);
        memo.setNombreArchivo(archivo.getOriginalFilename());
        memo.setContentType(archivo.getContentType());
        return memoRepository.save(memo);
    }

    /** Sirve el adjunto para previsualizacion/descarga (inline, respeta el Content-Type original). */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        Memo memo = buscar(id);
        verificarPropiedad(memo);

        if (memo.getRutaArchivo() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El memo no tiene un archivo adjunto");
        }
        Path archivo = storageDir.resolve(memo.getRutaArchivo());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }

        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = memo.getContentType() != null
                ? MediaType.parseMediaType(memo.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = memo.getNombreArchivo() != null ? memo.getNombreArchivo() : memo.getRutaArchivo();
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Memo memo = buscar(id);
        if (!CurrentUser.isAdministrador() && !memo.getRemitenteId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este memo");
        }
        memoRepository.delete(memo);
        return ResponseEntity.noContent().build();
    }

    private Memo buscar(Long id) {
        return memoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Memo no encontrado"));
    }

    private void verificarPropiedad(Memo memo) {
        Long userId = CurrentUser.id();
        boolean esPropio = memo.getRemitenteId().equals(userId) || memo.getDestinatarioId().equals(userId);
        if (!CurrentUser.isAdministrador() && !esPropio) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este memo");
        }
    }

    /** Extension del nombre original, saneada (solo alfanumerica, max 10 caracteres) para evitar path traversal. */
    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }
}

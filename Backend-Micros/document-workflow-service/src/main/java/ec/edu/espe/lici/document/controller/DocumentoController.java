package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Documento;
import ec.edu.espe.lici.document.repository.DocumentoRepository;
import ec.edu.espe.lici.document.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * ADMINISTRADOR: acceso total, puede firmar y archivar cualquier documento.
 * DOCENTE_INVESTIGADOR: solo documentos propios o donde figura como firmante.
 */
@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    private final DocumentoRepository documentoRepository;

    public DocumentoController(DocumentoRepository documentoRepository) {
        this.documentoRepository = documentoRepository;
    }

    @GetMapping
    public List<Documento> listar() {
        if (CurrentUser.isAdministrador()) {
            return documentoRepository.findAll();
        }
        Long userId = CurrentUser.id();
        return documentoRepository.findByUsuarioIdOrFirmanteId(userId, userId);
    }

    @GetMapping("/{id}")
    public Documento obtener(@PathVariable Long id) {
        Documento documento = buscar(id);
        verificarPropiedad(documento);
        return documento;
    }

    @PostMapping
    public ResponseEntity<Documento> crear(@Valid @RequestBody Documento documento) {
        if (!CurrentUser.isAdministrador()) {
            documento.setUsuarioId(CurrentUser.id());
        }
        documento.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(documentoRepository.save(documento));
    }

    @PutMapping("/{id}")
    public Documento actualizar(@PathVariable Long id, @Valid @RequestBody Documento request) {
        Documento documento = buscar(id);
        verificarPropiedad(documento);

        documento.setTitulo(request.getTitulo());
        documento.setTipo(request.getTipo());
        documento.setRutaArchivo(request.getRutaArchivo());
        documento.setHashArchivo(request.getHashArchivo());
        documento.setVersion(request.getVersion());
        documento.setFirmanteId(request.getFirmanteId());
        documento.setEstado(request.getEstado());
        return documentoRepository.save(documento);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Documento documento = buscar(id);
        if (!CurrentUser.isAdministrador() && !documento.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este documento");
        }
        documentoRepository.delete(documento);
        return ResponseEntity.noContent().build();
    }

    private Documento buscar(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
    }

    private void verificarPropiedad(Documento documento) {
        Long userId = CurrentUser.id();
        boolean esPropio = documento.getUsuarioId().equals(userId)
                || userId.equals(documento.getFirmanteId());
        if (!CurrentUser.isAdministrador() && !esPropio) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este documento");
        }
    }
}

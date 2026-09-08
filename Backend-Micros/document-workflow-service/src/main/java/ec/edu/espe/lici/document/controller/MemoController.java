package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Memo;
import ec.edu.espe.lici.document.repository.MemoRepository;
import ec.edu.espe.lici.common.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/memos")
public class MemoController {

    private final MemoRepository memoRepository;

    public MemoController(MemoRepository memoRepository) {
        this.memoRepository = memoRepository;
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
}

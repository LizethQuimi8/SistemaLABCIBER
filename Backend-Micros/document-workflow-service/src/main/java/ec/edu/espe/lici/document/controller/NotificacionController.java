package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.Notificacion;
import ec.edu.espe.lici.document.repository.NotificacionRepository;
import ec.edu.espe.lici.document.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Cada usuario solo ve y administra sus propias notificaciones. */
@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

    private final NotificacionRepository notificacionRepository;

    public NotificacionController(NotificacionRepository notificacionRepository) {
        this.notificacionRepository = notificacionRepository;
    }

    @GetMapping
    public List<Notificacion> listar() {
        return notificacionRepository.findByUsuarioId(CurrentUser.id());
    }

    @PostMapping
    public ResponseEntity<Notificacion> crear(@RequestBody Notificacion notificacion) {
        notificacion.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(notificacionRepository.save(notificacion));
    }

    @PatchMapping("/{id}/leer")
    public Notificacion marcarLeida(@PathVariable Long id) {
        Notificacion notificacion = notificacionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificacion no encontrada"));
        if (!notificacion.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a esta notificacion");
        }
        notificacion.setLeida(true);
        return notificacionRepository.save(notificacion);
    }
}

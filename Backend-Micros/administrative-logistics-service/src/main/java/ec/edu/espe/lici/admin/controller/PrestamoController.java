package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.domain.EstadoPrestamo;
import ec.edu.espe.lici.admin.domain.Prestamo;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.PrestamoRepository;
import ec.edu.espe.lici.admin.security.CurrentUser;
import ec.edu.espe.lici.admin.service.NotificacionClient;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Proceso de prestamo de bienes de inventario: un docente solo puede
 * solicitar un bien que este en estado DISPONIBLE, indicando desde/hasta
 * cuando lo necesita y por que. La solicitud queda PENDIENTE hasta que el
 * Admin. Infraestructura (o el ADMINISTRADOR) la apruebe -momento en el que
 * el bien pasa a EN_USO-, o hasta que el ADMINISTRADOR la rechace. Solo el
 * ADMINISTRADOR puede rechazar; los demas roles solo pueden aprobar o
 * visualizar.
 */
@RestController
@RequestMapping("/api/prestamos")
public class PrestamoController {

    private final PrestamoRepository prestamoRepository;
    private final BienInventarioRepository bienInventarioRepository;
    private final NotificacionClient notificacionClient;

    public PrestamoController(PrestamoRepository prestamoRepository,
                               BienInventarioRepository bienInventarioRepository,
                               NotificacionClient notificacionClient) {
        this.prestamoRepository = prestamoRepository;
        this.bienInventarioRepository = bienInventarioRepository;
        this.notificacionClient = notificacionClient;
    }

    @GetMapping
    public List<Prestamo> listar() {
        if (puedeGestionarSolicitudes()) {
            return prestamoRepository.findAll();
        }
        return prestamoRepository.findByUsuarioId(CurrentUser.id());
    }

    @GetMapping("/{id}")
    public Prestamo obtener(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        verificarPropiedad(prestamo);
        return prestamo;
    }

    @PostMapping
    public ResponseEntity<Prestamo> solicitar(@Valid @RequestBody PrestamoRequest request) {
        if (request.getFechaHasta().isBefore(request.getFechaDesde())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La fecha 'hasta' no puede ser anterior a la fecha 'desde'");
        }

        BienInventario bien = bienInventarioRepository.findById(request.getBienId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado"));

        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien no esta disponible para prestamo (estado actual: " + bien.getEstado() + ")");
        }

        Prestamo prestamo = Prestamo.builder()
                .bienId(bien.getId())
                .usuarioId(CurrentUser.id())
                .fechaDesde(request.getFechaDesde())
                .fechaHasta(request.getFechaHasta())
                .motivo(request.getMotivo())
                .observaciones(request.getObservaciones())
                .build();
        prestamo = prestamoRepository.save(prestamo);

        notificacionClient.notificarPorRol("ADMIN_INFRAESTRUCTURA",
                "Nueva solicitud de prestamo: " + bien.getNombre() + " (id " + prestamo.getId() + ")",
                CurrentUser.rawToken());

        return ResponseEntity.status(HttpStatus.CREATED).body(prestamo);
    }

    /** Aprueba una solicitud PENDIENTE: el bien pasa a EN_USO. Puede aprobar
     * el ADMINISTRADOR o el Admin. Infraestructura (dueno del modulo). */
    @PatchMapping("/{id}/aprobar")
    public Prestamo aprobar(@PathVariable Long id) {
        if (!puedeGestionarSolicitudes()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para aprobar prestamos");
        }
        Prestamo prestamo = buscar(id);
        if (prestamo.getEstado() != EstadoPrestamo.PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta pendiente de aprobacion");
        }

        BienInventario bien = bienInventarioRepository.findById(prestamo.getBienId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado"));
        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien ya no esta disponible (estado actual: " + bien.getEstado() + ")");
        }

        bien.setEstado(EstadoBien.EN_USO);
        bienInventarioRepository.save(bien);

        prestamo.setEstado(EstadoPrestamo.ACTIVO);
        prestamoRepository.save(prestamo);

        String token = CurrentUser.rawToken();
        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu prestamo de " + bien.getNombre() + " fue aprobado.", token);
        if (!CurrentUser.isAdministrador()) {
            notificacionClient.notificarPorRol("ADMINISTRADOR",
                    "Se autorizo el prestamo de " + bien.getNombre() + " (usuario #" + prestamo.getUsuarioId() + ")",
                    token);
        }

        return prestamo;
    }

    /** Rechaza una solicitud PENDIENTE. Exclusivo del ADMINISTRADOR: el
     * Admin. Infraestructura puede aprobar pero no denegar por su cuenta. */
    @PatchMapping("/{id}/rechazar")
    public Prestamo rechazar(@PathVariable Long id) {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo un administrador puede rechazar prestamos");
        }
        Prestamo prestamo = buscar(id);
        if (prestamo.getEstado() != EstadoPrestamo.PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta pendiente de aprobacion");
        }

        prestamo.setEstado(EstadoPrestamo.RECHAZADO);
        prestamoRepository.save(prestamo);

        bienInventarioRepository.findById(prestamo.getBienId()).ifPresent(bien ->
                notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                        "Tu prestamo de " + bien.getNombre() + " fue rechazado.", CurrentUser.rawToken()));

        return prestamo;
    }

    @PatchMapping("/{id}/devolver")
    public Prestamo devolver(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        verificarPropiedad(prestamo);

        if (prestamo.getEstado() != EstadoPrestamo.ACTIVO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta activo");
        }

        prestamo.setEstado(EstadoPrestamo.DEVUELTO);
        prestamo.setFechaDevolucion(LocalDateTime.now());
        prestamoRepository.save(prestamo);

        bienInventarioRepository.findById(prestamo.getBienId()).ifPresent(bien -> {
            if (bien.getEstado() == EstadoBien.EN_USO) {
                bien.setEstado(EstadoBien.DISPONIBLE);
                bienInventarioRepository.save(bien);
            }
        });

        return prestamo;
    }

    private Prestamo buscar(Long id) {
        return prestamoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prestamo no encontrado"));
    }

    private void verificarPropiedad(Prestamo prestamo) {
        if (!puedeGestionarSolicitudes() && !prestamo.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este prestamo");
        }
    }

    private boolean puedeGestionarSolicitudes() {
        return CurrentUser.isAdministrador() || CurrentUser.isAdminInfraestructura();
    }
}

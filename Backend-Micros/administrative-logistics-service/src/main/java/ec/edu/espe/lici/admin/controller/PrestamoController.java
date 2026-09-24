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
 * Proceso de prestamo de bienes de inventario, en dos etapas de aprobacion:
 * <p>
 * 1) Un docente solicita un bien DISPONIBLE (desde/hasta/motivo); queda
 * PENDIENTE. Admin. Infraestructura recibe la notificacion y puede aprobar
 * (pasa a APROBADO_INFRAESTRUCTURA, el bien sigue DISPONIBLE) o rechazar
 * (RECHAZADO, fin del proceso).
 * <p>
 * 2) Cuando Admin. Infraestructura aprueba, el ADMINISTRADOR recibe la
 * notificacion de confirmacion final y puede aceptar (ACTIVO, el bien pasa
 * a EN_USO) o rechazar (RECHAZADO) esa solicitud pre-aprobada.
 * <p>
 * Si el propio ADMINISTRADOR aprueba una solicitud PENDIENTE (sin pasar
 * primero por Infraestructura), se activa de inmediato: no tiene sentido
 * pedirle confirmacion a si mismo.
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
                "Nueva solicitud de prestamo: " + bien.getNombre(),
                prestamo.getId(), CurrentUser.rawToken());

        return ResponseEntity.status(HttpStatus.CREATED).body(prestamo);
    }

    /**
     * Aprueba un prestamo. Si esta PENDIENTE: Admin. Infraestructura o el
     * ADMINISTRADOR pueden aprobar; si aprueba Infraestructura queda
     * APROBADO_INFRAESTRUCTURA (a la espera de confirmacion), y si aprueba
     * el propio ADMINISTRADOR se activa de una vez. Si ya esta
     * APROBADO_INFRAESTRUCTURA, solo el ADMINISTRADOR puede dar la
     * confirmacion final (pasa a ACTIVO, el bien a EN_USO).
     */
    @PatchMapping("/{id}/aprobar")
    public Prestamo aprobar(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        String token = CurrentUser.rawToken();

        if (prestamo.getEstado() == EstadoPrestamo.PENDIENTE) {
            if (!puedeGestionarSolicitudes()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para aprobar prestamos");
            }
            if (CurrentUser.isAdministrador()) {
                return activar(prestamo, token);
            }

            BienInventario bien = bienDelPrestamo(prestamo);
            prestamo.setEstado(EstadoPrestamo.APROBADO_INFRAESTRUCTURA);
            prestamoRepository.save(prestamo);

            notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                    "Tu solicitud de prestamo de " + bien.getNombre() + " fue aprobada por Infraestructura y esta en revision final.",
                    prestamo.getId(), token);
            notificacionClient.notificarPorRol("ADMINISTRADOR",
                    "Prestamo de " + bien.getNombre() + " aprobado por Infraestructura: requiere tu confirmacion final.",
                    prestamo.getId(), token);
            return prestamo;
        }

        if (prestamo.getEstado() == EstadoPrestamo.APROBADO_INFRAESTRUCTURA) {
            if (!CurrentUser.isAdministrador()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el administrador puede dar la confirmacion final");
            }
            return activar(prestamo, token);
        }

        throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta pendiente de aprobacion");
    }

    private Prestamo activar(Prestamo prestamo, String token) {
        BienInventario bien = bienDelPrestamo(prestamo);
        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien ya no esta disponible (estado actual: " + bien.getEstado() + ")");
        }

        bien.setEstado(EstadoBien.EN_USO);
        bienInventarioRepository.save(bien);

        prestamo.setEstado(EstadoPrestamo.ACTIVO);
        prestamoRepository.save(prestamo);

        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu prestamo de " + bien.getNombre() + " fue aprobado.", prestamo.getId(), token);
        return prestamo;
    }

    /**
     * Rechaza un prestamo. Si esta PENDIENTE, puede rechazar Admin.
     * Infraestructura o el ADMINISTRADOR. Si ya esta
     * APROBADO_INFRAESTRUCTURA (pendiente de confirmacion final), solo el
     * ADMINISTRADOR puede rechazarlo.
     */
    @PatchMapping("/{id}/rechazar")
    public Prestamo rechazar(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);

        if (prestamo.getEstado() == EstadoPrestamo.PENDIENTE) {
            if (!puedeGestionarSolicitudes()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para rechazar prestamos");
            }
        } else if (prestamo.getEstado() == EstadoPrestamo.APROBADO_INFRAESTRUCTURA) {
            if (!CurrentUser.isAdministrador()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el administrador puede rechazar la confirmacion final");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta pendiente de aprobacion");
        }

        prestamo.setEstado(EstadoPrestamo.RECHAZADO);
        prestamoRepository.save(prestamo);

        BienInventario bien = bienDelPrestamo(prestamo);
        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu prestamo de " + bien.getNombre() + " fue rechazado.", prestamo.getId(), CurrentUser.rawToken());

        return prestamo;
    }

    private BienInventario bienDelPrestamo(Prestamo prestamo) {
        return bienInventarioRepository.findById(prestamo.getBienId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado"));
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

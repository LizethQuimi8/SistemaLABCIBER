package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.domain.EstadoPrestamo;
import ec.edu.espe.lici.admin.domain.Prestamo;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.PrestamoRepository;
import ec.edu.espe.lici.admin.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Proceso de prestamo de bienes de inventario: un docente solo puede
 * solicitar un bien que este en estado DISPONIBLE; al solicitarlo el bien
 * pasa a EN_USO y queda bloqueado para nuevas solicitudes hasta que se
 * registre su devolucion (vuelve a DISPONIBLE).
 */
@RestController
@RequestMapping("/api/prestamos")
public class PrestamoController {

    private final PrestamoRepository prestamoRepository;
    private final BienInventarioRepository bienInventarioRepository;

    public PrestamoController(PrestamoRepository prestamoRepository, BienInventarioRepository bienInventarioRepository) {
        this.prestamoRepository = prestamoRepository;
        this.bienInventarioRepository = bienInventarioRepository;
    }

    @GetMapping
    public List<Prestamo> listar() {
        if (CurrentUser.isAdministrador()) {
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
        BienInventario bien = bienInventarioRepository.findById(request.getBienId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado"));

        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien no esta disponible para prestamo (estado actual: " + bien.getEstado() + ")");
        }

        bien.setEstado(EstadoBien.EN_USO);
        bienInventarioRepository.save(bien);

        Prestamo prestamo = Prestamo.builder()
                .bienId(bien.getId())
                .usuarioId(CurrentUser.id())
                .observaciones(request.getObservaciones())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(prestamoRepository.save(prestamo));
    }

    @PatchMapping("/{id}/devolver")
    public Prestamo devolver(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        verificarPropiedad(prestamo);

        if (prestamo.getEstado() == EstadoPrestamo.DEVUELTO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo ya fue devuelto");
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
        if (!CurrentUser.isAdministrador() && !prestamo.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este prestamo");
        }
    }
}

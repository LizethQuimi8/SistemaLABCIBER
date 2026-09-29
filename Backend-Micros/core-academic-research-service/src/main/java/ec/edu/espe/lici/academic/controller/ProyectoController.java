package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Proyecto;
import ec.edu.espe.lici.academic.repository.ProyectoRepository;
import ec.edu.espe.lici.academic.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Todos los proyectos son visibles para cualquier usuario autenticado
 * (repositorio compartido del laboratorio); editar o eliminar un proyecto
 * concreto solo lo puede hacer su responsable (usuarioResponsableId == id del
 * usuario autenticado en el JWT) o el ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/proyectos")
public class ProyectoController {

    private final ProyectoRepository proyectoRepository;

    public ProyectoController(ProyectoRepository proyectoRepository) {
        this.proyectoRepository = proyectoRepository;
    }

    @GetMapping
    public List<Proyecto> listar() {
        return proyectoRepository.findAll();
    }

    @GetMapping("/{id}")
    public Proyecto obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<Proyecto> crear(@Valid @RequestBody Proyecto proyecto) {
        if (!CurrentUser.isAdministrador()) {
            proyecto.setUsuarioResponsableId(CurrentUser.id());
        }
        proyecto.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(proyectoRepository.save(proyecto));
    }

    @PutMapping("/{id}")
    public Proyecto actualizar(@PathVariable Long id, @Valid @RequestBody Proyecto request) {
        Proyecto proyecto = buscar(id);
        verificarPropiedad(proyecto);

        proyecto.setNombre(request.getNombre());
        proyecto.setDescripcion(request.getDescripcion());
        proyecto.setEstado(request.getEstado());
        proyecto.setPresupuesto(request.getPresupuesto());
        proyecto.setAvancePorcentaje(request.getAvancePorcentaje());
        proyecto.setFechaInicio(request.getFechaInicio());
        proyecto.setFechaFin(request.getFechaFin());
        if (CurrentUser.isAdministrador() && request.getUsuarioResponsableId() != null) {
            proyecto.setUsuarioResponsableId(request.getUsuarioResponsableId());
        }
        return proyectoRepository.save(proyecto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Proyecto proyecto = buscar(id);
        verificarPropiedad(proyecto);
        proyectoRepository.delete(proyecto);
        return ResponseEntity.noContent().build();
    }

    private Proyecto buscar(Long id) {
        return proyectoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
    }

    private void verificarPropiedad(Proyecto proyecto) {
        if (!CurrentUser.isAdministrador() && !proyecto.getUsuarioResponsableId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este proyecto");
        }
    }
}

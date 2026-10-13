package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.CategoriaGrupoTrabajo;
import ec.edu.espe.lici.document.domain.GrupoTrabajo;
import ec.edu.espe.lici.document.repository.GrupoTrabajoRepository;
import ec.edu.espe.lici.document.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Estructura organizacional del laboratorio: Coordinadores de Areas de
 * Trabajo de Investigacion, Comisiones de Operatividad y Macro-areas del
 * Consejo Cientifico (ver Resolucion ESPE-HCU-RES-2022-059). Cualquiera
 * consulta; solo el ADMINISTRADOR (Jefe de Laboratorio) la edita.
 */
@RestController
@RequestMapping("/api/estructura-organizacional")
public class GrupoTrabajoController {

    private final GrupoTrabajoRepository repository;

    public GrupoTrabajoController(GrupoTrabajoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<GrupoTrabajo> listar() {
        return repository.findAllByOrderByCategoriaAscOrdenAsc();
    }

    @PostMapping
    public GrupoTrabajo crear(@Valid @RequestBody GrupoTrabajoRequest request) {
        exigirAdministrador();
        GrupoTrabajo grupo = GrupoTrabajo.builder()
                .categoria(request.categoria())
                .sigla(request.sigla())
                .nombre(request.nombre())
                .responsables(request.responsables())
                .responsableIds(request.responsableIds())
                .observacion(request.observacion())
                .orden(request.orden() != null ? request.orden() : siguienteOrden(request.categoria()))
                .build();
        return repository.save(grupo);
    }

    @PutMapping("/{id}")
    public GrupoTrabajo actualizar(@PathVariable Long id, @Valid @RequestBody GrupoTrabajoRequest request) {
        exigirAdministrador();
        GrupoTrabajo grupo = buscar(id);
        grupo.setCategoria(request.categoria());
        grupo.setSigla(request.sigla());
        grupo.setNombre(request.nombre());
        grupo.setResponsables(request.responsables());
        grupo.setResponsableIds(request.responsableIds());
        grupo.setObservacion(request.observacion());
        if (request.orden() != null) {
            grupo.setOrden(request.orden());
        }
        return repository.save(grupo);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        exigirAdministrador();
        repository.delete(buscar(id));
    }

    private int siguienteOrden(CategoriaGrupoTrabajo categoria) {
        return (int) repository.findAllByOrderByCategoriaAscOrdenAsc().stream()
                .filter(g -> g.getCategoria() == categoria)
                .count() + 1;
    }

    private void exigirAdministrador() {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el Jefe de Laboratorio puede editar la estructura organizacional");
        }
    }

    private GrupoTrabajo buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grupo de trabajo no encontrado"));
    }

    public record GrupoTrabajoRequest(
            @NotNull CategoriaGrupoTrabajo categoria,
            String sigla,
            @NotBlank String nombre,
            String responsables,
            String responsableIds,
            String observacion,
            Integer orden
    ) {
    }
}

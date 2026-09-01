package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Publicacion;
import ec.edu.espe.lici.academic.repository.PublicacionRepository;
import ec.edu.espe.lici.academic.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * CRUD solo sobre las publicaciones propias para DOCENTE_INVESTIGADOR;
 * ADMINISTRADOR administra todas.
 */
@RestController
@RequestMapping("/api/publicaciones")
public class PublicacionController {

    private final PublicacionRepository publicacionRepository;

    public PublicacionController(PublicacionRepository publicacionRepository) {
        this.publicacionRepository = publicacionRepository;
    }

    @GetMapping
    public List<Publicacion> listar() {
        if (CurrentUser.isAdministrador()) {
            return publicacionRepository.findAll();
        }
        return publicacionRepository.findByUsuarioId(CurrentUser.id());
    }

    @GetMapping("/{id}")
    public Publicacion obtener(@PathVariable Long id) {
        Publicacion publicacion = buscar(id);
        verificarPropiedad(publicacion);
        return publicacion;
    }

    @PostMapping
    public ResponseEntity<Publicacion> crear(@Valid @RequestBody Publicacion publicacion) {
        if (!CurrentUser.isAdministrador()) {
            publicacion.setUsuarioId(CurrentUser.id());
        }
        publicacion.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(publicacionRepository.save(publicacion));
    }

    @PutMapping("/{id}")
    public Publicacion actualizar(@PathVariable Long id, @Valid @RequestBody Publicacion request) {
        Publicacion publicacion = buscar(id);
        verificarPropiedad(publicacion);

        publicacion.setInvestigadorId(request.getInvestigadorId());
        publicacion.setTitulo(request.getTitulo());
        publicacion.setRevista(request.getRevista());
        publicacion.setAnioPublicacion(request.getAnioPublicacion());
        publicacion.setDoi(request.getDoi());
        publicacion.setResumen(request.getResumen());
        return publicacionRepository.save(publicacion);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Publicacion publicacion = buscar(id);
        verificarPropiedad(publicacion);
        publicacionRepository.delete(publicacion);
        return ResponseEntity.noContent().build();
    }

    private Publicacion buscar(Long id) {
        return publicacionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicacion no encontrada"));
    }

    private void verificarPropiedad(Publicacion publicacion) {
        if (!CurrentUser.isAdministrador() && !publicacion.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a esta publicacion");
        }
    }
}

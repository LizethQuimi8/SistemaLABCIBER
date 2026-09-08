package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Investigador;
import ec.edu.espe.lici.academic.repository.InvestigadorRepository;
import ec.edu.espe.lici.common.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Los perfiles de investigador son de lectura publica entre usuarios
 * autenticados (directorio del laboratorio); la edicion queda restringida
 * al propio dueno del perfil o a un ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/investigadores")
public class InvestigadorController {

    private final InvestigadorRepository investigadorRepository;

    public InvestigadorController(InvestigadorRepository investigadorRepository) {
        this.investigadorRepository = investigadorRepository;
    }

    @GetMapping
    public List<Investigador> listar() {
        return investigadorRepository.findAll();
    }

    @GetMapping("/{id}")
    public Investigador obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<Investigador> crear(@Valid @RequestBody Investigador investigador) {
        if (!CurrentUser.isAdministrador()) {
            investigador.setUsuarioId(CurrentUser.id());
        }
        investigador.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(investigadorRepository.save(investigador));
    }

    @PutMapping("/{id}")
    public Investigador actualizar(@PathVariable Long id, @Valid @RequestBody Investigador request) {
        Investigador investigador = buscar(id);
        verificarPropiedad(investigador);

        investigador.setNombreCompleto(request.getNombreCompleto());
        investigador.setTituloAcademico(request.getTituloAcademico());
        investigador.setAreaInvestigacion(request.getAreaInvestigacion());
        investigador.setBiografia(request.getBiografia());
        return investigadorRepository.save(investigador);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Investigador investigador = buscar(id);
        verificarPropiedad(investigador);
        investigadorRepository.delete(investigador);
        return ResponseEntity.noContent().build();
    }

    private Investigador buscar(Long id) {
        return investigadorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investigador no encontrado"));
    }

    private void verificarPropiedad(Investigador investigador) {
        if (!CurrentUser.isAdministrador() && !investigador.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este perfil");
        }
    }
}

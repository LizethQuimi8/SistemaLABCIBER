package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Investigador;
import ec.edu.espe.lici.academic.repository.InvestigadorRepository;
import ec.edu.espe.lici.academic.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Los perfiles de investigador son de lectura y edicion publica entre
 * usuarios autenticados (directorio del laboratorio): cualquiera puede crear
 * un perfil (para si mismo o para otro usuario) y editar cualquier perfil
 * existente. Eliminar queda restringido a ADMINISTRADOR.
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
        if (investigador.getUsuarioId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe indicar el usuario dueno del perfil");
        }
        investigador.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(investigadorRepository.save(investigador));
    }

    @PutMapping("/{id}")
    public Investigador actualizar(@PathVariable Long id, @Valid @RequestBody Investigador request) {
        Investigador investigador = buscar(id);

        investigador.setNombreCompleto(request.getNombreCompleto());
        investigador.setTituloAcademico(request.getTituloAcademico());
        investigador.setAreaInvestigacion(request.getAreaInvestigacion());
        investigador.setBiografia(request.getBiografia());
        return investigadorRepository.save(investigador);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo un administrador puede eliminar perfiles de investigador");
        }
        Investigador investigador = buscar(id);
        investigadorRepository.delete(investigador);
        return ResponseEntity.noContent().build();
    }

    private Investigador buscar(Long id) {
        return investigadorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investigador no encontrado"));
    }
}

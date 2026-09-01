package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.CompraPublica;
import ec.edu.espe.lici.admin.repository.CompraPublicaRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Todo el modulo restringido a ADMINISTRADOR (ver SecurityConfig): Docente sin acceso. */
@RestController
@RequestMapping("/api/compras")
public class CompraPublicaController {

    private final CompraPublicaRepository compraPublicaRepository;

    public CompraPublicaController(CompraPublicaRepository compraPublicaRepository) {
        this.compraPublicaRepository = compraPublicaRepository;
    }

    @GetMapping
    public List<CompraPublica> listar() {
        return compraPublicaRepository.findAll();
    }

    @GetMapping("/{id}")
    public CompraPublica obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<CompraPublica> crear(@Valid @RequestBody CompraPublica compra) {
        compra.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(compraPublicaRepository.save(compra));
    }

    @PutMapping("/{id}")
    public CompraPublica actualizar(@PathVariable Long id, @Valid @RequestBody CompraPublica request) {
        CompraPublica compra = buscar(id);
        compra.setDescripcion(request.getDescripcion());
        compra.setNumeroProceso(request.getNumeroProceso());
        compra.setTipoContratacion(request.getTipoContratacion());
        compra.setMonto(request.getMonto());
        compra.setEstado(request.getEstado());
        compra.setUsuarioSolicitanteId(request.getUsuarioSolicitanteId());
        compra.setFechaSolicitud(request.getFechaSolicitud());
        compra.setFechaAdjudicacion(request.getFechaAdjudicacion());
        return compraPublicaRepository.save(compra);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!compraPublicaRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Compra no encontrada");
        }
        compraPublicaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private CompraPublica buscar(Long id) {
        return compraPublicaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compra no encontrada"));
    }
}

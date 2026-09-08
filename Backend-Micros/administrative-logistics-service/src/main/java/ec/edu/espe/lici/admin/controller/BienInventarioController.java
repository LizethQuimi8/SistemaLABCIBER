package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** GET habilitado para ambos roles; escritura restringida a ADMINISTRADOR (ver SecurityConfig). */

@RestController
@RequestMapping("/api/inventario")
public class BienInventarioController {

    private final BienInventarioRepository bienInventarioRepository;

    public BienInventarioController(BienInventarioRepository bienInventarioRepository) {
        this.bienInventarioRepository = bienInventarioRepository;
    }

    @GetMapping
    public List<BienInventario> listar() {
        return bienInventarioRepository.findAll();
    }

    @GetMapping("/{id}")
    public BienInventario obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<BienInventario> crear(@Valid @RequestBody BienInventario bien) {
        bien.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(bienInventarioRepository.save(bien));
    }

    @PutMapping("/{id}")
    public BienInventario actualizar(@PathVariable Long id, @Valid @RequestBody BienInventario request) {
        BienInventario bien = buscar(id);
        bien.setNombre(request.getNombre());
        bien.setCodigoInventario(request.getCodigoInventario());
        bien.setCategoria(request.getCategoria());
        bien.setCantidad(request.getCantidad());
        bien.setEstado(request.getEstado());
        bien.setUbicacion(request.getUbicacion());
        return bienInventarioRepository.save(bien);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!bienInventarioRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bien no encontrado");
        }
        bienInventarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private BienInventario buscar(Long id) {
        return bienInventarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bien no encontrado"));
    }
}

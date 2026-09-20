package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.service.InventarioImportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

/** GET habilitado para ambos roles; escritura restringida a ADMINISTRADOR (ver SecurityConfig). */

@RestController
@RequestMapping("/api/inventario")
public class BienInventarioController {

    private final BienInventarioRepository bienInventarioRepository;
    private final InventarioImportService inventarioImportService;

    public BienInventarioController(BienInventarioRepository bienInventarioRepository,
                                     InventarioImportService inventarioImportService) {
        this.bienInventarioRepository = bienInventarioRepository;
        this.inventarioImportService = inventarioImportService;
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
        bien.setCodigoIC(request.getCodigoIC());
        bien.setCategoria(request.getCategoria());
        bien.setCantidad(request.getCantidad());
        bien.setEstado(request.getEstado());
        bien.setUbicacion(request.getUbicacion());
        return bienInventarioRepository.save(bien);
    }

    @PatchMapping("/{id}/estado")
    public BienInventario cambiarEstado(@PathVariable Long id, @RequestParam EstadoBien estado) {
        BienInventario bien = buscar(id);

        if (estado == EstadoBien.EN_USO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El estado EN_USO solo se asigna al solicitar un prestamo");
        }
        if (bien.getEstado() == EstadoBien.EN_USO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien esta prestado; registre la devolucion del prestamo antes de cambiar su estado");
        }

        bien.setEstado(estado);
        return bienInventarioRepository.save(bien);
    }

    /** Importa/actualiza en bloque la matriz institucional de inventario (Excel .xlsx). */
    @PostMapping(value = "/importar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public InventarioImportService.ImportResult importar(@RequestParam("archivo") MultipartFile archivo) throws IOException {
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        try {
            return inventarioImportService.importar(archivo);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
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

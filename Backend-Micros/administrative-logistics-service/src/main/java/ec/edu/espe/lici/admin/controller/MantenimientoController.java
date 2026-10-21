package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.Mantenimiento;
import ec.edu.espe.lici.admin.domain.TipoMantenimiento;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.MantenimientoRepository;
import ec.edu.espe.lici.admin.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.List;

/**
 * Registro de mantenimientos correctivos y preventivos de los bienes de
 * Inventario, con documento de respaldo opcional (informe, factura,
 * bitacora). GET y PUT (editar) habilitados para los 4 roles; crear, subir
 * archivo y eliminar quedan restringidos a ADMINISTRADOR y
 * ADMIN_INFRAESTRUCTURA (ver SecurityConfig).
 */
@RestController
@RequestMapping("/api/mantenimientos")
public class MantenimientoController {

    private final MantenimientoRepository mantenimientoRepository;
    private final BienInventarioRepository bienInventarioRepository;
    private final Path storageDir;

    public MantenimientoController(MantenimientoRepository mantenimientoRepository,
                                    BienInventarioRepository bienInventarioRepository,
                                    @Value("${lici.storage.mantenimientos-dir}") String storageDir) {
        this.mantenimientoRepository = mantenimientoRepository;
        this.bienInventarioRepository = bienInventarioRepository;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<Mantenimiento> listar(@RequestParam(required = false) Long bienId) {
        if (bienId != null) {
            return mantenimientoRepository.findByBienId(bienId);
        }
        return mantenimientoRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Mantenimiento> crear(@RequestBody MantenimientoRequest request) {
        if (!bienInventarioRepository.existsById(request.getBienId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado");
        }
        Mantenimiento mantenimiento = Mantenimiento.builder()
                .bienId(request.getBienId())
                .tipo(request.getTipo())
                .fecha(request.getFecha())
                .descripcion(request.getDescripcion())
                .usuarioId(CurrentUser.id())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(mantenimientoRepository.save(mantenimiento));
    }

    @PutMapping("/{id}")
    public Mantenimiento actualizar(@PathVariable Long id, @RequestBody MantenimientoRequest request) {
        Mantenimiento mantenimiento = buscar(id);
        mantenimiento.setTipo(request.getTipo());
        mantenimiento.setFecha(request.getFecha());
        mantenimiento.setDescripcion(request.getDescripcion());
        return mantenimientoRepository.save(mantenimiento);
    }

    /** Sube (o reemplaza) el documento de respaldo del mantenimiento. */
    @PostMapping(value = "/{id}/archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mantenimiento subirArchivo(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Mantenimiento mantenimiento = buscar(id);
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        String nombreAlmacenado = "mantenimiento-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        mantenimiento.setArchivoRuta(nombreAlmacenado);
        mantenimiento.setArchivoNombreArchivo(archivo.getOriginalFilename());
        mantenimiento.setArchivoContentType(archivo.getContentType());
        return mantenimientoRepository.save(mantenimiento);
    }

    /** Sirve el documento de respaldo para previsualizacion/descarga. */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        Mantenimiento mantenimiento = buscar(id);
        if (mantenimiento.getArchivoRuta() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este mantenimiento no tiene un archivo cargado");
        }
        Path archivo = storageDir.resolve(mantenimiento.getArchivoRuta());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }
        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = mantenimiento.getArchivoContentType() != null
                ? MediaType.parseMediaType(mantenimiento.getArchivoContentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = mantenimiento.getArchivoNombreArchivo() != null ? mantenimiento.getArchivoNombreArchivo() : "archivo";
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Mantenimiento mantenimiento = buscar(id);
        mantenimientoRepository.delete(mantenimiento);
        return ResponseEntity.noContent().build();
    }

    private Mantenimiento buscar(Long id) {
        return mantenimientoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mantenimiento no encontrado"));
    }

    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }

    public static class MantenimientoRequest {
        private Long bienId;
        private TipoMantenimiento tipo;
        private LocalDate fecha;
        private String descripcion;

        public Long getBienId() { return bienId; }
        public void setBienId(Long bienId) { this.bienId = bienId; }
        public TipoMantenimiento getTipo() { return tipo; }
        public void setTipo(TipoMantenimiento tipo) { this.tipo = tipo; }
        public LocalDate getFecha() { return fecha; }
        public void setFecha(LocalDate fecha) { this.fecha = fecha; }
        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    }
}

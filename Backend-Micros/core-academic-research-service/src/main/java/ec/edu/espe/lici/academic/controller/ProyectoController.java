package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Proyecto;
import ec.edu.espe.lici.academic.repository.ProyectoRepository;
import ec.edu.espe.lici.academic.security.CurrentUser;
import jakarta.validation.Valid;
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
import java.util.List;

/**
 * Todos los proyectos son visibles para cualquier usuario autenticado
 * (repositorio compartido del laboratorio); editar o eliminar un proyecto
 * concreto, asi como subir su documento de aprobacion, solo lo puede hacer su
 * responsable (usuarioResponsableId == id del usuario autenticado en el JWT)
 * o el ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/proyectos")
public class ProyectoController {

    private final ProyectoRepository proyectoRepository;
    private final Path storageDir;

    public ProyectoController(ProyectoRepository proyectoRepository,
                               @Value("${lici.storage.proyectos-dir}") String storageDir) {
        this.proyectoRepository = proyectoRepository;
        this.storageDir = Path.of(storageDir);
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

    /** Sube (o reemplaza) el documento de aprobacion (PDF) del proyecto. */
    @PostMapping(value = "/{id}/documento-aprobacion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Proyecto subirDocumentoAprobacion(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Proyecto proyecto = buscar(id);
        verificarPropiedad(proyecto);
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        String nombreAlmacenado = "aprobacion-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        proyecto.setDocumentoAprobacionRuta(nombreAlmacenado);
        proyecto.setDocumentoAprobacionNombreArchivo(archivo.getOriginalFilename());
        proyecto.setDocumentoAprobacionContentType(archivo.getContentType());
        return proyectoRepository.save(proyecto);
    }

    /** Sirve el documento de aprobacion para previsualizacion/descarga. */
    @GetMapping("/{id}/documento-aprobacion")
    public ResponseEntity<Resource> descargarDocumentoAprobacion(@PathVariable Long id) throws MalformedURLException {
        Proyecto proyecto = buscar(id);
        if (proyecto.getDocumentoAprobacionRuta() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este proyecto no tiene un documento de aprobacion cargado");
        }
        Path archivo = storageDir.resolve(proyecto.getDocumentoAprobacionRuta());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }
        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = proyecto.getDocumentoAprobacionContentType() != null
                ? MediaType.parseMediaType(proyecto.getDocumentoAprobacionContentType())
                : MediaType.APPLICATION_PDF;
        String nombre = proyecto.getDocumentoAprobacionNombreArchivo() != null ? proyecto.getDocumentoAprobacionNombreArchivo() : "documento-aprobacion.pdf";
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
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

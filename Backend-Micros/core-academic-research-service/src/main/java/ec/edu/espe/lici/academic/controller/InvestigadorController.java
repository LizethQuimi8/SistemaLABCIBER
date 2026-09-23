package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Investigador;
import ec.edu.espe.lici.academic.repository.InvestigadorRepository;
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
 * Los perfiles de investigador son de lectura y edicion publica entre
 * usuarios autenticados (directorio del laboratorio): cualquiera puede crear
 * un perfil (para si mismo o para otro usuario) y editar cualquier perfil
 * existente. Eliminar queda restringido a ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/investigadores")
public class InvestigadorController {

    private final InvestigadorRepository investigadorRepository;
    private final Path storageDir;

    public InvestigadorController(InvestigadorRepository investigadorRepository,
                                   @Value("${lici.storage.curriculums-dir}") String storageDir) {
        this.investigadorRepository = investigadorRepository;
        this.storageDir = Path.of(storageDir);
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

    /** Sube (o reemplaza) el curriculum (CV) de un perfil ya creado. */
    @PostMapping(value = "/{id}/curriculum", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Investigador subirCurriculum(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Investigador investigador = buscar(id);
        String nombreAlmacenado = guardarArchivo("cv", id, archivo);
        investigador.setCurriculumRuta(nombreAlmacenado);
        investigador.setCurriculumNombreArchivo(archivo.getOriginalFilename());
        investigador.setCurriculumContentType(archivo.getContentType());
        return investigadorRepository.save(investigador);
    }

    /** Sirve el curriculum para previsualizacion/descarga (inline, respeta el Content-Type original). */
    @GetMapping("/{id}/curriculum")
    public ResponseEntity<Resource> descargarCurriculum(@PathVariable Long id) throws MalformedURLException {
        Investigador investigador = buscar(id);
        return servirArchivo(investigador.getCurriculumRuta(), investigador.getCurriculumContentType(), investigador.getCurriculumNombreArchivo());
    }

    /** Sube (o reemplaza) el horario de clases que imparte el docente. */
    @PostMapping(value = "/{id}/horario", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Investigador subirHorario(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Investigador investigador = buscar(id);
        String nombreAlmacenado = guardarArchivo("horario", id, archivo);
        investigador.setHorarioRuta(nombreAlmacenado);
        investigador.setHorarioNombreArchivo(archivo.getOriginalFilename());
        investigador.setHorarioContentType(archivo.getContentType());
        return investigadorRepository.save(investigador);
    }

    /** Sirve el horario de clases para previsualizacion/descarga. */
    @GetMapping("/{id}/horario")
    public ResponseEntity<Resource> descargarHorario(@PathVariable Long id) throws MalformedURLException {
        Investigador investigador = buscar(id);
        return servirArchivo(investigador.getHorarioRuta(), investigador.getHorarioContentType(), investigador.getHorarioNombreArchivo());
    }

    private String guardarArchivo(String prefijo, Long id, MultipartFile archivo) throws IOException {
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        String nombreAlmacenado = prefijo + "-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        return nombreAlmacenado;
    }

    private ResponseEntity<Resource> servirArchivo(String ruta, String contentType, String nombreOriginal) throws MalformedURLException {
        if (ruta == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El perfil no tiene ese archivo cargado");
        }
        Path archivo = storageDir.resolve(ruta);
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }
        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = nombreOriginal != null ? nombreOriginal : "archivo";
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

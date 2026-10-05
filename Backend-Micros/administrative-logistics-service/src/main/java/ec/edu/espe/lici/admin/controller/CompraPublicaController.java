package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.CompraPublica;
import ec.edu.espe.lici.admin.domain.FaseCompra;
import ec.edu.espe.lici.admin.repository.CompraPublicaRepository;
import ec.edu.espe.lici.admin.security.CurrentUser;
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
import java.util.Arrays;
import java.util.List;

/**
 * Cualquiera de los 4 roles puede crear un objeto de contratacion, verlo y
 * subir su archivo inicial (ver SecurityConfig). Editar el proceso o
 * reemplazar su archivo, despues de creado, queda restringido a quien lo
 * creo, a los responsables listados en ese momento (si se agrega un
 * responsable nuevo, ese tambien gana acceso de inmediato) o al
 * ADMINISTRADOR. Eliminar es exclusivo del ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/compras")
public class CompraPublicaController {

    private final CompraPublicaRepository compraPublicaRepository;
    private final Path storageDir;

    public CompraPublicaController(CompraPublicaRepository compraPublicaRepository,
                                    @Value("${lici.storage.compras-dir}") String storageDir) {
        this.compraPublicaRepository = compraPublicaRepository;
        this.storageDir = Path.of(storageDir);
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
        compra.setUsuarioSolicitanteId(CurrentUser.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(compraPublicaRepository.save(compra));
    }

    @PutMapping("/{id}")
    public CompraPublica actualizar(@PathVariable Long id, @Valid @RequestBody CompraPublica request) {
        CompraPublica compra = buscar(id);
        verificarAcceso(compra);

        compra.setObjetoContratacion(request.getObjetoContratacion());
        compra.setNumeroProceso(request.getNumeroProceso());
        compra.setTipoContratacion(request.getTipoContratacion());
        compra.setMonto(request.getMonto());
        compra.setFase(request.getFase());
        compra.setAnio(request.getAnio());
        compra.setResponsables(request.getResponsables());
        compra.setResponsableIds(request.getResponsableIds());
        compra.setFechaSolicitud(request.getFechaSolicitud());
        compra.setFechaAdjudicacion(request.getFechaAdjudicacion());
        return compraPublicaRepository.save(compra);
    }

    @PatchMapping("/{id}/fase")
    public CompraPublica cambiarFase(@PathVariable Long id, @RequestParam FaseCompra fase) {
        CompraPublica compra = buscar(id);
        verificarAcceso(compra);
        compra.setFase(fase);
        return compraPublicaRepository.save(compra);
    }

    /** Sube (o reemplaza) el archivo adjunto (p. ej. resolucion, acta) de una compra ya creada. */
    @PostMapping(value = "/{id}/archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompraPublica subirArchivo(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        CompraPublica compra = buscar(id);
        verificarAcceso(compra);
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        String nombreAlmacenado = "compra-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        compra.setArchivoRuta(nombreAlmacenado);
        compra.setArchivoNombreArchivo(archivo.getOriginalFilename());
        compra.setArchivoContentType(archivo.getContentType());
        return compraPublicaRepository.save(compra);
    }

    /** Sirve el archivo adjunto para previsualizacion/descarga (inline, respeta el Content-Type original). */
    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) throws MalformedURLException {
        CompraPublica compra = buscar(id);
        return servirArchivo(compra.getArchivoRuta(), compra.getArchivoContentType(), compra.getArchivoNombreArchivo(), "archivo");
    }

    /** Sube (o reemplaza) el ZIP con los documentos de la fase Entrega de bienes. */
    @PostMapping(value = "/{id}/zip-entrega", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompraPublica subirZipEntrega(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        CompraPublica compra = buscar(id);
        verificarAcceso(compra);
        if (compra.getFase() == FaseCompra.PREPARATORIA || compra.getFase() == FaseCompra.PRECONTRACTUAL || compra.getFase() == FaseCompra.CONTRACTUAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El ZIP de entrega solo se puede cargar al llegar a la fase Entrega de bienes");
        }
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo esta vacio");
        }
        String nombreOriginal = archivo.getOriginalFilename();
        boolean esZip = nombreOriginal != null && nombreOriginal.toLowerCase().endsWith(".zip");
        if (!esZip) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes adjuntar un archivo .zip");
        }

        String nombreAlmacenado = "compra-" + id + "-zip-" + System.currentTimeMillis() + ".zip";
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        compra.setZipEntregaRuta(nombreAlmacenado);
        compra.setZipEntregaNombreArchivo(nombreOriginal);
        compra.setZipEntregaContentType(archivo.getContentType());
        return compraPublicaRepository.save(compra);
    }

    /** Sirve el ZIP de la fase Entrega de bienes para descarga. */
    @GetMapping("/{id}/zip-entrega")
    public ResponseEntity<Resource> descargarZipEntrega(@PathVariable Long id) throws MalformedURLException {
        CompraPublica compra = buscar(id);
        return servirArchivo(compra.getZipEntregaRuta(), compra.getZipEntregaContentType(), compra.getZipEntregaNombreArchivo(), "entrega.zip");
    }

    private ResponseEntity<Resource> servirArchivo(String ruta, String contentType, String nombreOriginal, String nombrePorDefecto) throws MalformedURLException {
        if (ruta == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La compra no tiene ese archivo cargado");
        }
        Path archivo = storageDir.resolve(ruta);
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }
        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = nombreOriginal != null ? nombreOriginal : nombrePorDefecto;
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
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo un administrador puede eliminar objetos de contratacion");
        }
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

    /** ADMINISTRADOR, quien creo el proceso, o cualquiera de sus responsables actuales. */
    private void verificarAcceso(CompraPublica compra) {
        if (CurrentUser.isAdministrador()) {
            return;
        }
        Long id = CurrentUser.id();
        if (id.equals(compra.getUsuarioSolicitanteId())) {
            return;
        }
        if (esResponsable(compra, id)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo los responsables de este proceso (o el administrador) pueden editarlo");
    }

    private boolean esResponsable(CompraPublica compra, Long usuarioId) {
        String ids = compra.getResponsableIds();
        if (ids == null || ids.isBlank()) {
            return false;
        }
        return Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .anyMatch(s -> s.equals(String.valueOf(usuarioId)));
    }
}

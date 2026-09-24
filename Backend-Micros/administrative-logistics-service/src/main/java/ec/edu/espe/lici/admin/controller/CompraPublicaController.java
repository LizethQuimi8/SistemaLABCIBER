package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.CompraPublica;
import ec.edu.espe.lici.admin.domain.FaseCompra;
import ec.edu.espe.lici.admin.repository.CompraPublicaRepository;
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

/** Escritura restringida a ADMINISTRADOR y RESPONSABLE_COMPRAS (ver SecurityConfig); el resto solo lectura. */
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
        return ResponseEntity.status(HttpStatus.CREATED).body(compraPublicaRepository.save(compra));
    }

    @PutMapping("/{id}")
    public CompraPublica actualizar(@PathVariable Long id, @Valid @RequestBody CompraPublica request) {
        CompraPublica compra = buscar(id);
        compra.setObjetoContratacion(request.getObjetoContratacion());
        compra.setNumeroProceso(request.getNumeroProceso());
        compra.setTipoContratacion(request.getTipoContratacion());
        compra.setMonto(request.getMonto());
        compra.setFase(request.getFase());
        compra.setAnio(request.getAnio());
        compra.setResponsables(request.getResponsables());
        compra.setUsuarioSolicitanteId(request.getUsuarioSolicitanteId());
        compra.setFechaSolicitud(request.getFechaSolicitud());
        compra.setFechaAdjudicacion(request.getFechaAdjudicacion());
        return compraPublicaRepository.save(compra);
    }

    @PatchMapping("/{id}/fase")
    public CompraPublica cambiarFase(@PathVariable Long id, @RequestParam FaseCompra fase) {
        CompraPublica compra = buscar(id);
        compra.setFase(fase);
        return compraPublicaRepository.save(compra);
    }

    /** Sube (o reemplaza) el archivo adjunto (p. ej. resolucion, acta) de una compra ya creada. */
    @PostMapping(value = "/{id}/archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompraPublica subirArchivo(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        CompraPublica compra = buscar(id);
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
        if (compra.getArchivoRuta() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La compra no tiene un archivo cargado");
        }
        Path archivo = storageDir.resolve(compra.getArchivoRuta());
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }
        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = compra.getArchivoContentType() != null
                ? MediaType.parseMediaType(compra.getArchivoContentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        String nombre = compra.getArchivoNombreArchivo() != null ? compra.getArchivoNombreArchivo() : "archivo";
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

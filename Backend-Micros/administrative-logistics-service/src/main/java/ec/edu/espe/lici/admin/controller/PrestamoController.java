package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.domain.EstadoPrestamo;
import ec.edu.espe.lici.admin.domain.Prestamo;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.repository.PrestamoRepository;
import ec.edu.espe.lici.admin.security.CurrentUser;
import ec.edu.espe.lici.admin.service.NotificacionClient;
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
import java.time.LocalDateTime;
import java.util.List;

/**
 * Proceso de prestamo de bienes de inventario, segun el procedimiento
 * institucional UPDI-FOR-2024-V2-062 (Gestion, Asignacion, Uso y Control de
 * la Infraestructura Tecnologica del LICI). Roles del documento mapeados a
 * roles del sistema: "Responsable de Infraestructura Tecnologica" y
 * "Custodio del Bien" = ADMIN_INFRAESTRUCTURA; "Jefe de Laboratorio" =
 * ADMINISTRADOR.
 * <p>
 * 1) Solicitud: un docente solicita un bien DISPONIBLE (desde/hasta/motivo/
 * proyecto asociado opcional); queda PENDIENTE. Admin. Infraestructura
 * recibe la notificacion (evaluacion tecnica) y puede aprobar (pasa a
 * APROBADO_INFRAESTRUCTURA) o rechazar (RECHAZADO, fin del proceso).
 * <p>
 * 2) Autorizacion: cuando Admin. Infraestructura aprueba, el ADMINISTRADOR
 * recibe la notificacion de autorizacion final y puede autorizar (pasa a
 * AUTORIZADO, el bien sigue DISPONIBLE) o rechazar (RECHAZADO) esa solicitud
 * pre-aprobada. Si el propio ADMINISTRADOR aprueba una solicitud PENDIENTE
 * (sin pasar primero por Infraestructura), pasa directo a AUTORIZADO: no
 * tiene sentido pedirle confirmacion a si mismo.
 * <p>
 * 3) Entrega: con el prestamo AUTORIZADO, Admin. Infraestructura (como
 * Custodio del Bien) genera y sube el Acta de Entrega firmada (Formulario
 * F-02); solo entonces el prestamo pasa a ACTIVO y el bien a EN_USO.
 * <p>
 * 4) Devolucion: exige AMBAS firmas, sin orden fijo: el solicitante (solo
 * el, nadie mas) sube el acta de devolucion firmada (DEVOLUCION_PENDIENTE) y
 * tanto Admin. Infraestructura como el ADMINISTRADOR reciben la notificacion
 * de inmediato. Cada uno valida por su lado (se registra su firma por
 * separado); en cuanto firma uno, se le avisa al otro que falta su firma.
 * Solo cuando AMBOS validaron se cierra la devolucion (DEVUELTO, el bien
 * vuelve a DISPONIBLE). Cualquiera de los dos puede rechazar el acta en
 * cualquier momento mientras este pendiente ("archivo incorrecto"): vuelve a
 * ACTIVO, se reinician ambas firmas y el solicitante debe subir una nueva.
 */
@RestController
@RequestMapping("/api/prestamos")
public class PrestamoController {

    private final PrestamoRepository prestamoRepository;
    private final BienInventarioRepository bienInventarioRepository;
    private final NotificacionClient notificacionClient;
    private final Path storageDir;

    public PrestamoController(PrestamoRepository prestamoRepository,
                               BienInventarioRepository bienInventarioRepository,
                               NotificacionClient notificacionClient,
                               @Value("${lici.storage.prestamos-dir}") String storageDir) {
        this.prestamoRepository = prestamoRepository;
        this.bienInventarioRepository = bienInventarioRepository;
        this.notificacionClient = notificacionClient;
        this.storageDir = Path.of(storageDir);
    }

    @GetMapping
    public List<Prestamo> listar() {
        if (puedeGestionarSolicitudes()) {
            return prestamoRepository.findAll();
        }
        return prestamoRepository.findByUsuarioId(CurrentUser.id());
    }

    @GetMapping("/{id}")
    public Prestamo obtener(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        verificarPropiedad(prestamo);
        return prestamo;
    }

    @PostMapping
    public ResponseEntity<Prestamo> solicitar(@Valid @RequestBody PrestamoRequest request) {
        if (request.getFechaHasta().isBefore(request.getFechaDesde())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La fecha 'hasta' no puede ser anterior a la fecha 'desde'");
        }

        BienInventario bien = bienInventarioRepository.findById(request.getBienId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado"));

        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien no esta disponible para prestamo (estado actual: " + bien.getEstado() + ")");
        }

        Prestamo prestamo = Prestamo.builder()
                .bienId(bien.getId())
                .usuarioId(CurrentUser.id())
                .fechaDesde(request.getFechaDesde())
                .fechaHasta(request.getFechaHasta())
                .motivo(request.getMotivo())
                .proyectoId(request.getProyectoId())
                .observaciones(request.getObservaciones())
                .build();
        prestamo = prestamoRepository.save(prestamo);

        notificacionClient.notificarPorRol("ADMIN_INFRAESTRUCTURA",
                "Nueva solicitud de prestamo: " + bien.getNombre(),
                prestamo.getId(), CurrentUser.rawToken());

        return ResponseEntity.status(HttpStatus.CREATED).body(prestamo);
    }

    /**
     * Aprueba/autoriza un prestamo. Si esta PENDIENTE: Admin. Infraestructura
     * o el ADMINISTRADOR pueden aprobar (evaluacion tecnica); si aprueba
     * Infraestructura queda APROBADO_INFRAESTRUCTURA (a la espera de
     * autorizacion), y si aprueba el propio ADMINISTRADOR pasa directo a
     * AUTORIZADO. Si ya esta APROBADO_INFRAESTRUCTURA, solo el ADMINISTRADOR
     * puede dar la autorizacion final (pasa a AUTORIZADO). El bien sigue
     * DISPONIBLE hasta que se cargue el Acta de Entrega (ver {@link #entregar}).
     */
    @PatchMapping("/{id}/aprobar")
    public Prestamo aprobar(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        String token = CurrentUser.rawToken();

        if (prestamo.getEstado() == EstadoPrestamo.PENDIENTE) {
            if (!puedeGestionarSolicitudes()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para aprobar prestamos");
            }
            if (CurrentUser.isAdministrador()) {
                return autorizar(prestamo, token);
            }

            BienInventario bien = bienDelPrestamo(prestamo);
            prestamo.setEstado(EstadoPrestamo.APROBADO_INFRAESTRUCTURA);
            prestamoRepository.save(prestamo);

            notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                    "Tu solicitud de prestamo de " + bien.getNombre() + " fue aprobada por Infraestructura y esta en revision final.",
                    prestamo.getId(), token);
            notificacionClient.notificarPorRol("ADMINISTRADOR",
                    "Prestamo de " + bien.getNombre() + " aprobado por Infraestructura: requiere tu autorizacion final.",
                    prestamo.getId(), token);
            return prestamo;
        }

        if (prestamo.getEstado() == EstadoPrestamo.APROBADO_INFRAESTRUCTURA) {
            if (!CurrentUser.isAdministrador()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el Jefe de Laboratorio puede dar la autorizacion final");
            }
            return autorizar(prestamo, token);
        }

        throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta pendiente de aprobacion");
    }

    private Prestamo autorizar(Prestamo prestamo, String token) {
        BienInventario bien = bienDelPrestamo(prestamo);
        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien ya no esta disponible (estado actual: " + bien.getEstado() + ")");
        }

        prestamo.setEstado(EstadoPrestamo.AUTORIZADO);
        prestamoRepository.save(prestamo);

        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu prestamo de " + bien.getNombre() + " fue autorizado: espera el Acta de Entrega del Custodio del Bien.",
                prestamo.getId(), token);
        notificacionClient.notificarPorRol("ADMIN_INFRAESTRUCTURA",
                "Prestamo de " + bien.getNombre() + " autorizado: genera y sube el Acta de Entrega.",
                prestamo.getId(), token);
        return prestamo;
    }

    /**
     * Rechaza un prestamo. Si esta PENDIENTE, puede rechazar Admin.
     * Infraestructura o el ADMINISTRADOR. Si ya esta APROBADO_INFRAESTRUCTURA
     * o AUTORIZADO, solo el ADMINISTRADOR puede rechazarlo.
     */
    @PatchMapping("/{id}/rechazar")
    public Prestamo rechazar(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);

        if (prestamo.getEstado() == EstadoPrestamo.PENDIENTE) {
            if (!puedeGestionarSolicitudes()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para rechazar prestamos");
            }
        } else if (prestamo.getEstado() == EstadoPrestamo.APROBADO_INFRAESTRUCTURA || prestamo.getEstado() == EstadoPrestamo.AUTORIZADO) {
            if (!CurrentUser.isAdministrador()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el Jefe de Laboratorio puede rechazar en esta etapa");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta pendiente de aprobacion");
        }

        prestamo.setEstado(EstadoPrestamo.RECHAZADO);
        prestamoRepository.save(prestamo);

        BienInventario bien = bienDelPrestamo(prestamo);
        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu prestamo de " + bien.getNombre() + " fue rechazado.", prestamo.getId(), CurrentUser.rawToken());

        return prestamo;
    }

    private BienInventario bienDelPrestamo(Prestamo prestamo) {
        return bienInventarioRepository.findById(prestamo.getBienId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El bien no esta inventariado"));
    }

    /**
     * Registra la entrega formal del bien (Formulario F-02): exclusivo de
     * Admin. Infraestructura (Custodio del Bien) o el ADMINISTRADOR, y solo
     * cuando el prestamo ya esta AUTORIZADO. Exige subir el Acta de Entrega
     * firmada; solo entonces el bien pasa a EN_USO y el prestamo a ACTIVO.
     */
    @PostMapping(value = "/{id}/entrega", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Prestamo entregar(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Prestamo prestamo = buscar(id);
        if (!puedeGestionarSolicitudes()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para registrar la entrega del bien");
        }
        if (prestamo.getEstado() != EstadoPrestamo.AUTORIZADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta autorizado para su entrega");
        }
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes adjuntar el Acta de Entrega firmada");
        }

        BienInventario bien = bienDelPrestamo(prestamo);
        if (bien.getEstado() != EstadoBien.DISPONIBLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El bien ya no esta disponible (estado actual: " + bien.getEstado() + ")");
        }

        String nombreAlmacenado = "entrega-" + id + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        prestamo.setActaEntregaRuta(nombreAlmacenado);
        prestamo.setActaEntregaNombreArchivo(archivo.getOriginalFilename());
        prestamo.setActaEntregaContentType(archivo.getContentType());
        prestamo.setFechaEntrega(LocalDateTime.now());
        prestamo.setEstado(EstadoPrestamo.ACTIVO);
        prestamoRepository.save(prestamo);

        bien.setEstado(EstadoBien.EN_USO);
        bienInventarioRepository.save(bien);

        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Se registro la entrega de " + bien.getNombre() + ": tu prestamo esta activo.",
                prestamo.getId(), CurrentUser.rawToken());
        return prestamo;
    }

    /** Sirve el Acta de Entrega para previsualizacion/descarga. */
    @GetMapping("/{id}/acta-entrega")
    public ResponseEntity<Resource> descargarActaEntrega(@PathVariable Long id) throws MalformedURLException {
        Prestamo prestamo = buscar(id);
        verificarPropiedad(prestamo);
        return servirArchivo(prestamo.getActaEntregaRuta(), prestamo.getActaEntregaContentType(), prestamo.getActaEntregaNombreArchivo(), "acta-entrega.pdf");
    }

    /**
     * Inicia la devolucion: exclusivo del usuario que solicito el prestamo
     * (ni el ADMINISTRADOR ni Admin. Infraestructura pueden hacerlo en su
     * lugar). Exige subir el acta de entrega/devolucion firmada; el bien
     * sigue EN_USO hasta que la devolucion quede validada por ambas firmas.
     */
    @PostMapping(value = "/{id}/devolucion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Prestamo iniciarDevolucion(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        Prestamo prestamo = buscar(id);
        if (!prestamo.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo quien solicito el prestamo puede registrar la devolucion");
        }
        if (prestamo.getEstado() != EstadoPrestamo.ACTIVO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El prestamo no esta activo");
        }
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes adjuntar el acta de devolucion firmada");
        }

        String nombreAlmacenado = guardarActa(id, archivo);
        prestamo.setActaRuta(nombreAlmacenado);
        prestamo.setActaNombreArchivo(archivo.getOriginalFilename());
        prestamo.setActaContentType(archivo.getContentType());
        prestamo.setObservacionDevolucion(null);
        prestamo.setDevolucionFirmaInfraestructura(false);
        prestamo.setDevolucionFirmaAdministrador(false);
        prestamo.setEstado(EstadoPrestamo.DEVOLUCION_PENDIENTE);
        prestamoRepository.save(prestamo);

        BienInventario bien = bienDelPrestamo(prestamo);
        String token = CurrentUser.rawToken();
        String mensaje = "Acta de devolucion subida para " + bien.getNombre() + ": requiere la firma de Admin. Infraestructura y del Jefe de Laboratorio.";
        notificacionClient.notificarPorRol("ADMIN_INFRAESTRUCTURA", mensaje, prestamo.getId(), token);
        notificacionClient.notificarPorRol("ADMINISTRADOR", mensaje, prestamo.getId(), token);

        return prestamo;
    }

    /**
     * Registra la firma de quien valida (Admin. Infraestructura o el
     * ADMINISTRADOR) sobre el acta de devolucion vigente. Cada rol firma de
     * forma independiente, en cualquier orden; en cuanto firma uno se avisa
     * al otro que falta su firma. Solo al tener AMBAS firmas se cierra la
     * devolucion (DEVUELTO, el bien vuelve a DISPONIBLE).
     */
    @PatchMapping("/{id}/aprobar-devolucion")
    public Prestamo aprobarDevolucion(@PathVariable Long id) {
        Prestamo prestamo = buscar(id);
        if (prestamo.getEstado() != EstadoPrestamo.DEVOLUCION_PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La devolucion no esta pendiente de validacion");
        }

        if (CurrentUser.isAdministrador()) {
            if (Boolean.TRUE.equals(prestamo.getDevolucionFirmaAdministrador())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya registraste tu firma; falta la firma de Admin. Infraestructura");
            }
            prestamo.setDevolucionFirmaAdministrador(true);
        } else if (CurrentUser.isAdminInfraestructura()) {
            if (Boolean.TRUE.equals(prestamo.getDevolucionFirmaInfraestructura())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya registraste tu firma; falta la firma del Jefe de Laboratorio");
            }
            prestamo.setDevolucionFirmaInfraestructura(true);
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para validar devoluciones");
        }

        String token = CurrentUser.rawToken();
        if (Boolean.TRUE.equals(prestamo.getDevolucionFirmaAdministrador()) && Boolean.TRUE.equals(prestamo.getDevolucionFirmaInfraestructura())) {
            return cerrarDevolucion(prestamo, token);
        }

        prestamoRepository.save(prestamo);
        BienInventario bien = bienDelPrestamo(prestamo);
        String rolFaltante = CurrentUser.isAdministrador() ? "ADMIN_INFRAESTRUCTURA" : "ADMINISTRADOR";
        String quienFirmo = CurrentUser.isAdministrador() ? "el Jefe de Laboratorio" : "Admin. Infraestructura";
        notificacionClient.notificarPorRol(rolFaltante,
                "Ya firmo " + quienFirmo + " la devolucion de " + bien.getNombre() + ": falta tu firma.",
                prestamo.getId(), token);
        return prestamo;
    }

    private Prestamo cerrarDevolucion(Prestamo prestamo, String token) {
        BienInventario bien = bienDelPrestamo(prestamo);

        prestamo.setEstado(EstadoPrestamo.DEVUELTO);
        prestamo.setFechaDevolucion(LocalDateTime.now());
        if (prestamo.getObservacionDevolucion() == null || prestamo.getObservacionDevolucion().isBlank()) {
            prestamo.setObservacionDevolucion("Devuelto conforme");
        }
        prestamoRepository.save(prestamo);

        if (bien.getEstado() == EstadoBien.EN_USO) {
            bien.setEstado(EstadoBien.DISPONIBLE);
            bienInventarioRepository.save(bien);
        }

        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu devolucion de " + bien.getNombre() + " quedo confirmada.", prestamo.getId(), token);
        return prestamo;
    }

    /**
     * Rechaza el acta de devolucion (p. ej. "archivo incorrecto"): vuelve a
     * ACTIVO para que el solicitante suba una nueva, reiniciando ambas
     * firmas. Cualquiera de los dos (Admin. Infraestructura o el
     * ADMINISTRADOR) puede rechazarla mientras este pendiente, sin importar
     * si el otro ya habia firmado.
     */
    @PatchMapping("/{id}/rechazar-devolucion")
    public Prestamo rechazarDevolucion(@PathVariable Long id, @RequestParam(required = false) String observacion) {
        Prestamo prestamo = buscar(id);

        if (prestamo.getEstado() != EstadoPrestamo.DEVOLUCION_PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La devolucion no esta pendiente de validacion");
        }
        if (!puedeGestionarSolicitudes()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permiso para rechazar devoluciones");
        }

        prestamo.setEstado(EstadoPrestamo.ACTIVO);
        prestamo.setObservacionDevolucion(observacion != null && !observacion.isBlank() ? observacion : "Archivo incorrecto");
        prestamo.setDevolucionFirmaInfraestructura(false);
        prestamo.setDevolucionFirmaAdministrador(false);
        prestamoRepository.save(prestamo);

        BienInventario bien = bienDelPrestamo(prestamo);
        notificacionClient.notificarUsuario(prestamo.getUsuarioId(),
                "Tu acta de devolucion de " + bien.getNombre() + " fue rechazada (" + prestamo.getObservacionDevolucion() + "). Vuelve a subirla.",
                prestamo.getId(), CurrentUser.rawToken());

        return prestamo;
    }

    /** Sirve el acta de devolucion para previsualizacion/descarga. */
    @GetMapping("/{id}/acta")
    public ResponseEntity<Resource> descargarActa(@PathVariable Long id) throws MalformedURLException {
        Prestamo prestamo = buscar(id);
        verificarPropiedad(prestamo);
        return servirArchivo(prestamo.getActaRuta(), prestamo.getActaContentType(), prestamo.getActaNombreArchivo(), "acta.pdf");
    }

    private ResponseEntity<Resource> servirArchivo(String ruta, String contentType, String nombreOriginal, String nombrePorDefecto) throws MalformedURLException {
        if (ruta == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este prestamo no tiene ese archivo cargado");
        }
        Path archivo = storageDir.resolve(ruta);
        if (!Files.exists(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo no encontrado en el almacenamiento");
        }

        Resource recurso = new UrlResource(archivo.toUri());
        MediaType tipo = contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_PDF;
        String nombre = nombreOriginal != null ? nombreOriginal : nombrePorDefecto;
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombre.replace("\"", "") + "\"")
                .body(recurso);
    }

    private String guardarActa(Long prestamoId, MultipartFile archivo) throws IOException {
        String nombreAlmacenado = "acta-" + prestamoId + "-" + System.currentTimeMillis() + extensionSegura(archivo.getOriginalFilename());
        Files.createDirectories(storageDir);
        Path destino = storageDir.resolve(nombreAlmacenado);
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
        }
        return nombreAlmacenado;
    }

    private String extensionSegura(String nombreOriginal) {
        if (nombreOriginal == null) return "";
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) return "";
        String ext = nombreOriginal.substring(punto + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }

    private Prestamo buscar(Long id) {
        return prestamoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prestamo no encontrado"));
    }

    private void verificarPropiedad(Prestamo prestamo) {
        if (!puedeGestionarSolicitudes() && !prestamo.getUsuarioId().equals(CurrentUser.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene acceso a este prestamo");
        }
    }

    private boolean puedeGestionarSolicitudes() {
        return CurrentUser.isAdministrador() || CurrentUser.isAdminInfraestructura();
    }
}

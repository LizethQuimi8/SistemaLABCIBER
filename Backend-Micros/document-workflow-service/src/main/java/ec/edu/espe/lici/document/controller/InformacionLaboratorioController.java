package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.InformacionLaboratorio;
import ec.edu.espe.lici.document.repository.InformacionLaboratorioRepository;
import ec.edu.espe.lici.document.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Texto institucional (que es el laboratorio, mision, vision, objetivos) que
 * se muestra antes de todo en Planificacion Estrategica. Registro unico:
 * cualquiera lo lee, solo el ADMINISTRADOR lo edita.
 */
@RestController
@RequestMapping("/api/planificacion-estrategica/info")
public class InformacionLaboratorioController {

    private final InformacionLaboratorioRepository repository;

    public InformacionLaboratorioController(InformacionLaboratorioRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public InformacionLaboratorio obtener() {
        List<InformacionLaboratorio> todos = repository.findAll();
        if (todos.isEmpty()) {
            return InformacionLaboratorio.builder().build();
        }
        return todos.get(0);
    }

    @PutMapping
    public InformacionLaboratorio actualizar(@Valid @RequestBody InformacionLaboratorio request) {
        if (!CurrentUser.isAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el Jefe de Laboratorio puede editar esta informacion");
        }
        List<InformacionLaboratorio> todos = repository.findAll();
        InformacionLaboratorio info = todos.isEmpty() ? new InformacionLaboratorio() : todos.get(0);
        info.setQueEsElLaboratorio(request.getQueEsElLaboratorio());
        info.setAmbitosActuacion(request.getAmbitosActuacion());
        info.setMision(request.getMision());
        info.setVision(request.getVision());
        info.setObjetivos(request.getObjetivos());
        info.setIndicadoresClave(request.getIndicadoresClave());
        return repository.save(info);
    }
}

package ec.edu.espe.lici.document.repository;

import ec.edu.espe.lici.document.domain.GrupoTrabajo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GrupoTrabajoRepository extends JpaRepository<GrupoTrabajo, Long> {
    List<GrupoTrabajo> findAllByOrderByCategoriaAscOrdenAsc();
}

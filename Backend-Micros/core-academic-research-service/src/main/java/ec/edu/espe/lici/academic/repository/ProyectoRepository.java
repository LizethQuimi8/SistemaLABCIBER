package ec.edu.espe.lici.academic.repository;

import ec.edu.espe.lici.academic.domain.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {
    List<Proyecto> findByUsuarioResponsableId(Long usuarioResponsableId);
}

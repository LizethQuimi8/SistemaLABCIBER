package ec.edu.espe.lici.academic.repository;

import ec.edu.espe.lici.academic.domain.Publicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PublicacionRepository extends JpaRepository<Publicacion, Long> {
    List<Publicacion> findByUsuarioId(Long usuarioId);
    List<Publicacion> findByInvestigadorId(Long investigadorId);
}

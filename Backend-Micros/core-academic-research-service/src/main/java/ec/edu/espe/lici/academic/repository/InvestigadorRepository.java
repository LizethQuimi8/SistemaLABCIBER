package ec.edu.espe.lici.academic.repository;

import ec.edu.espe.lici.academic.domain.Investigador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvestigadorRepository extends JpaRepository<Investigador, Long> {
    Optional<Investigador> findByUsuarioId(Long usuarioId);
}

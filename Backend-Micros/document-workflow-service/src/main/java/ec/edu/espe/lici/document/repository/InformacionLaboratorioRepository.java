package ec.edu.espe.lici.document.repository;

import ec.edu.espe.lici.document.domain.InformacionLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InformacionLaboratorioRepository extends JpaRepository<InformacionLaboratorio, Long> {
}

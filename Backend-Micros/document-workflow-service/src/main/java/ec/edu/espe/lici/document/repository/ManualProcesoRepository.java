package ec.edu.espe.lici.document.repository;

import ec.edu.espe.lici.document.domain.ManualProceso;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManualProcesoRepository extends JpaRepository<ManualProceso, Long> {
}

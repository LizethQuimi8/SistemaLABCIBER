package ec.edu.espe.lici.admin.repository;

import ec.edu.espe.lici.admin.domain.Mantenimiento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {
    List<Mantenimiento> findByBienId(Long bienId);
}

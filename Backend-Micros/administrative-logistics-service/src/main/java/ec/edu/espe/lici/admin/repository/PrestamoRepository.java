package ec.edu.espe.lici.admin.repository;

import ec.edu.espe.lici.admin.domain.Prestamo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrestamoRepository extends JpaRepository<Prestamo, Long> {
    List<Prestamo> findByUsuarioId(Long usuarioId);
}

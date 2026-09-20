package ec.edu.espe.lici.admin.repository;

import ec.edu.espe.lici.admin.domain.BienInventario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BienInventarioRepository extends JpaRepository<BienInventario, Long> {
    Optional<BienInventario> findByCodigoIC(String codigoIC);

    /** No es unico: la matriz institucional puede reutilizar el mismo codigo
     * de "posicion de trabajo" en varios bienes distintos (ver BienInventario). */
    List<BienInventario> findByCodigoInventario(String codigoInventario);
}

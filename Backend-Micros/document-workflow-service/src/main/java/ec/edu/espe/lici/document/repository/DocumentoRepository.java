package ec.edu.espe.lici.document.repository;

import ec.edu.espe.lici.document.domain.Documento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentoRepository extends JpaRepository<Documento, Long> {
    List<Documento> findByUsuarioIdOrFirmanteId(Long usuarioId, Long firmanteId);
}

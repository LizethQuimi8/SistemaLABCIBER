package ec.edu.espe.lici.document.repository;

import ec.edu.espe.lici.document.domain.Memo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemoRepository extends JpaRepository<Memo, Long> {
    List<Memo> findByRemitenteIdOrDestinatarioId(Long remitenteId, Long destinatarioId);
}

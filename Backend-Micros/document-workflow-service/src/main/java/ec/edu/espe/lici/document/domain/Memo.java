package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "memos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Memo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 250)
    private String asunto;

    @Column(nullable = false, length = 4000)
    private String contenido;

    @Column(nullable = false)
    private Long remitenteId;

    @Column(nullable = false)
    private Long destinatarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoMemo estado;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;

    @PrePersist
    void prePersist() {
        this.fecha = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoMemo.ENVIADO;
        }
    }
}

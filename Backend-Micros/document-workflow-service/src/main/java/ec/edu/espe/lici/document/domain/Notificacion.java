package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notificaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 1000)
    private String mensaje;

    @Column(length = 50)
    private String tipo;

    @Builder.Default
    private boolean leida = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;

    @PrePersist
    void prePersist() {
        this.fecha = LocalDateTime.now();
    }
}

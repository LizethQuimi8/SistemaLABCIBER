package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Texto institucional del laboratorio (que es, mision, vision, objetivos)
 * que se muestra antes de todo en Planificacion Estrategica. Es un registro
 * unico (siempre el primero de la tabla); solo el ADMINISTRADOR lo edita. */
@Entity
@Table(name = "informacion_laboratorio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InformacionLaboratorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 4000)
    private String queEsElLaboratorio;

    @Column(length = 2000)
    private String mision;

    @Column(length = 2000)
    private String vision;

    @Column(length = 4000)
    private String objetivos;

    private LocalDateTime fechaActualizacion;

    @PrePersist
    @PreUpdate
    void actualizarFecha() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}

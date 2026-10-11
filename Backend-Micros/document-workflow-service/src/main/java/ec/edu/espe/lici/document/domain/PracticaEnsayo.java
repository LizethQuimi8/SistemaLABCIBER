package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Registro del desarrollo de una practica y/o ensayo en el laboratorio, con
 * documento de respaldo opcional. El responsable (quien la registra, o a
 * quien el ADMINISTRADOR se la asigne) edita/elimina la suya; el resto solo
 * ve; el ADMINISTRADOR edita/elimina cualquiera (ver PracticaEnsayoController). */
@Entity
@Table(name = "practicas_ensayos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PracticaEnsayo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 250)
    private String titulo;

    @Column(nullable = false)
    private LocalDate fecha;

    /** Id del Usuario (core-security-users-service) responsable de la practica/ensayo. */
    @Column(nullable = false)
    private Long responsableId;

    @Column(nullable = false, length = 3000)
    private String descripcion;

    private String archivoRuta;

    private String archivoNombreArchivo;

    private String archivoContentType;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    void prePersist() {
        this.fechaRegistro = LocalDateTime.now();
        if (this.fecha == null) {
            this.fecha = LocalDate.now();
        }
    }
}

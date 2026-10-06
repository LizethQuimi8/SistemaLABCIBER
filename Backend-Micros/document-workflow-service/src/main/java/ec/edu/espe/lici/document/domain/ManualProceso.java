package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Manual, proceso o procedimiento del laboratorio (PDF). Solo el ADMINISTRADOR
 * puede cargar, editar o eliminar; el resto de roles solo puede ver/descargar
 * (ver ManualProcesoController). */
@Entity
@Table(name = "manuales_procesos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManualProceso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 250)
    private String titulo;

    @Column(length = 2000)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoManual tipo;

    /** Nombre del archivo tal como quedo guardado en el volumen de almacenamiento
     * (ver ManualProcesoController); el binario nunca se guarda en la BD. */
    @Column(length = 500)
    private String rutaArchivo;

    /** Nombre original del archivo subido, para mostrarlo/descargarlo. */
    @Column(length = 255)
    private String nombreArchivo;

    @Column(length = 100)
    private String contentType;

    /** Id del Usuario (siempre ADMINISTRADOR) que cargo o modifico por ultima vez el archivo. */
    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCarga;

    @PrePersist
    void prePersist() {
        this.fechaCarga = LocalDateTime.now();
        if (this.tipo == null) {
            this.tipo = TipoManual.MANUAL;
        }
    }
}

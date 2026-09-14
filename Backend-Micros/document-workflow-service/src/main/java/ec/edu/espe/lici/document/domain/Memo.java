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

    /** Nombre del archivo adjunto tal como quedo guardado en el volumen de
     * almacenamiento (ver MemoController); el binario nunca se guarda en la BD. */
    @Column(length = 500)
    private String rutaArchivo;

    /** Nombre original del archivo adjunto, para mostrarlo/descargarlo. */
    @Column(length = 255)
    private String nombreArchivo;

    /** Content-Type detectado al subir el adjunto, usado para la previsualizacion. */
    @Column(length = 100)
    private String contentType;

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

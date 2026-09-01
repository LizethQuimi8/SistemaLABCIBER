package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "documentos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 250)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoDocumento tipo;

    /** Ruta o hash del archivo; el binario se guarda en un volumen, no en la BD. */
    @Column(length = 500)
    private String rutaArchivo;

    @Column(length = 128)
    private String hashArchivo;

    @Builder.Default
    private Integer version = 1;

    /** Id del Usuario que cargo el documento. */
    @Column(nullable = false)
    private Long usuarioId;

    /** Id del Usuario firmante, si el documento requiere firma electronica. */
    private Long firmanteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoDocumento estado;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCarga;

    @PrePersist
    void prePersist() {
        this.fechaCarga = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoDocumento.BORRADOR;
        }
    }
}

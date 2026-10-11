package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Documento de referencia del CyberRange (guias, topologias, manuales de
 * escenarios). Solo el ADMINISTRADOR puede cargar, editar o eliminar; el
 * resto de roles solo puede ver/descargar (ver CyberRangeDocumentoController). */
@Entity
@Table(name = "cyberrange_documentos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CyberRangeDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 250)
    private String titulo;

    @Column(length = 2000)
    private String descripcion;

    @Column(length = 500)
    private String rutaArchivo;

    @Column(length = 255)
    private String nombreArchivo;

    @Column(length = 100)
    private String contentType;

    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCarga;

    @PrePersist
    void prePersist() {
        this.fechaCarga = LocalDateTime.now();
    }
}

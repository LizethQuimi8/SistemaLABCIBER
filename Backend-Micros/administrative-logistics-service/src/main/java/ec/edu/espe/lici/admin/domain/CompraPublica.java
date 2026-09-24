package ec.edu.espe.lici.admin.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Un objeto de contratacion del plan anual de compras publicas (PAC), cargado
 * manualmente por el administrador y llevado a traves de las 5 fases del
 * proceso de contratacion (semaforizacion). */
@Entity
@Table(name = "compras_publicas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompraPublica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Objeto de contratacion, p. ej. "Adquisicion de rack". */
    @Column(nullable = false, length = 300)
    private String objetoContratacion;

    @Column(length = 50)
    private String numeroProceso;

    @Column(length = 100)
    private String tipoContratacion;

    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FaseCompra fase;

    /** Anio del plan anual de contrataciones, para clasificar el listado. */
    @Column(nullable = false)
    private Integer anio;

    /** Nombres de los responsables del proceso, en texto libre (p. ej. "Ing. Gancino, Ing. Roman"). */
    @Column(length = 300)
    private String responsables;

    /** Id del Usuario (core-security-users-service) que solicito la compra. */
    private Long usuarioSolicitanteId;

    private LocalDate fechaSolicitud;

    private LocalDate fechaAdjudicacion;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Nombre del archivo tal como fue almacenado en disco (ver lici.storage.compras-dir). */
    private String archivoRuta;

    /** Nombre original del archivo subido, usado para mostrarlo/descargarlo. */
    private String archivoNombreArchivo;

    private String archivoContentType;

    @PrePersist
    void prePersist() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.fase == null) {
            this.fase = FaseCompra.PREPARATORIA;
        }
        if (this.anio == null) {
            this.anio = LocalDate.now().getYear();
        }
    }
}

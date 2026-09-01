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

    @Column(nullable = false, length = 300)
    private String descripcion;

    @Column(length = 50)
    private String numeroProceso;

    @Column(length = 100)
    private String tipoContratacion;

    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCompra estado;

    /** Id del Usuario (core-security-users-service) que solicito la compra. */
    private Long usuarioSolicitanteId;

    private LocalDate fechaSolicitud;

    private LocalDate fechaAdjudicacion;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void prePersist() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoCompra.SOLICITADA;
        }
    }
}

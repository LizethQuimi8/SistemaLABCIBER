package ec.edu.espe.lici.admin.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Registro de solicitud/aprobacion/devolucion de un BienInventario. Nace en
 * PENDIENTE y el responsable de infraestructura (o el administrador) la
 * aprueba o el administrador la rechaza; solo al aprobarse el bien pasa a
 * EN_USO. Un bien solo puede tener un prestamo ACTIVO a la vez (controlado
 * via el estado del bien). */
@Entity
@Table(name = "prestamos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prestamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long bienId;

    /** Id del Usuario (core-security-users-service) que solicita el prestamo. */
    @Column(nullable = false)
    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPrestamo estado;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaSolicitud;

    /** Desde cuando necesita el bien, indicado por el solicitante. */
    @Column(nullable = false)
    private LocalDate fechaDesde;

    /** Hasta cuando lo necesita, indicado por el solicitante. */
    @Column(nullable = false)
    private LocalDate fechaHasta;

    /** Por que lo necesita (obligatorio al solicitar). */
    @Column(nullable = false, length = 500)
    private String motivo;

    private LocalDateTime fechaDevolucion;

    @Column(length = 500)
    private String observaciones;

    @PrePersist
    void prePersist() {
        this.fechaSolicitud = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoPrestamo.PENDIENTE;
        }
    }
}

package ec.edu.espe.lici.admin.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Registro de un mantenimiento (correctivo o preventivo) realizado sobre un
 * BienInventario, con su documento de respaldo opcional (informe, factura,
 * bitacora). Escritura restringida a ADMINISTRADOR y ADMIN_INFRAESTRUCTURA
 * (ver SecurityConfig / MantenimientoController), lectura abierta a todos
 * los roles que ya pueden ver Inventario. */
@Entity
@Table(name = "mantenimientos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long bienId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMantenimiento tipo;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 2000)
    private String descripcion;

    /** Id del Usuario (core-security-users-service) que registro el mantenimiento. */
    @Column(nullable = false)
    private Long usuarioId;

    /** Nombre del archivo (informe, factura, bitacora) tal como quedo guardado
     * en el volumen de almacenamiento (ver MantenimientoController). */
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

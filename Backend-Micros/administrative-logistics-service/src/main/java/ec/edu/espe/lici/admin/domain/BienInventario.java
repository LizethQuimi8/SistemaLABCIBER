package ec.edu.espe.lici.admin.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "bienes_inventario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BienInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nombre;

    /** Codigo interno asignado por el laboratorio (etiqueta propia del LICI).
     * NO es unico: la matriz institucional a veces reutiliza el mismo codigo
     * de "posicion de trabajo" para varios bienes distintos (p. ej. monitor,
     * teclado y mouse de un mismo puesto comparten codigo). */
    @Column(length = 50)
    private String codigoInventario;

    /** Codigo IC: codigo oficial del sistema institucional de activos fijos/bienes
     * (columna "Codigo de Bien ESPE" de la matriz). */
    @Column(length = 50)
    private String codigoIC;

    @Column(length = 150)
    private String marca;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(length = 100)
    private String numeroSerie;

    @Column(columnDefinition = "TEXT")
    private String detallesTecnicos;

    /** Persona responsable del bien segun la matriz institucional (texto libre). */
    @Column(length = 150)
    private String custodio;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(length = 100)
    private String categoria;

    @Builder.Default
    private Integer cantidad = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoBien estado;

    @Column(length = 150)
    private String ubicacion;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    void prePersist() {
        this.fechaRegistro = LocalDateTime.now();
        if (this.estado == null) {
            this.estado = EstadoBien.DISPONIBLE;
        }
    }
}

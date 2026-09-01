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

    @Column(unique = true, length = 50)
    private String codigoInventario;

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

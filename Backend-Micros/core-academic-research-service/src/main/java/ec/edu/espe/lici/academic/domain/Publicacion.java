package ec.edu.espe.lici.academic.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "publicaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Publicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long investigadorId;

    /** Id del Usuario (core-security-users-service) autor/propietario del registro. */
    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 300)
    private String titulo;

    @Column(length = 200)
    private String revista;

    private Integer anioPublicacion;

    @Column(length = 100)
    private String doi;

    @Column(length = 2000)
    private String resumen;
}

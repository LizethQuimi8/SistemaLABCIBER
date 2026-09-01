package ec.edu.espe.lici.academic.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "investigadores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Investigador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Id del Usuario (core-security-users-service) al que pertenece el perfil. */
    @Column(nullable = false, unique = true)
    private Long usuarioId;

    @Column(nullable = false, length = 200)
    private String nombreCompleto;

    @Column(length = 150)
    private String tituloAcademico;

    @Column(length = 150)
    private String areaInvestigacion;

    @Column(length = 2000)
    private String biografia;
}

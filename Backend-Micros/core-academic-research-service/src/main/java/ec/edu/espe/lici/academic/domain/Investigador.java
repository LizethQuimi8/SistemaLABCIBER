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

    /** Nombre del archivo tal como fue almacenado en disco (ver lici.storage.curriculums-dir). */
    private String curriculumRuta;

    /** Nombre original del archivo subido, usado para mostrarlo/descargarlo. */
    private String curriculumNombreArchivo;

    private String curriculumContentType;

    /** Horario de clases que imparte el docente (mismo almacenamiento que el curriculum). */
    private String horarioRuta;

    private String horarioNombreArchivo;

    private String horarioContentType;
}

package ec.edu.espe.lici.document.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Una fila de la estructura organizacional del laboratorio: un area de
 * coordinacion, una comision de operatividad o una macro-area del Consejo
 * Cientifico, con sus responsables. Ver Resolucion ESPE-HCU-RES-2022-059. */
@Entity
@Table(name = "grupos_trabajo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrupoTrabajo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaGrupoTrabajo categoria;

    /** Sigla corta, p. ej. "GASI"; vacio para comisiones/macro-areas que no tienen una. */
    @Column(length = 20)
    private String sigla;

    /** Nombre completo del area/comision/macro-area. */
    @Column(nullable = false, length = 300)
    private String nombre;

    /** Nombres de los responsables en texto libre, para mostrar (p. ej. "Mario Ron"). */
    @Column(length = 500)
    private String responsables;

    /** Ids (core-security-users-service) de los mismos responsables, separados por coma. */
    @Column(length = 300)
    private String responsableIds;

    /** Nota opcional, p. ej. "(componente forense operativo)". */
    @Column(length = 300)
    private String observacion;

    /** Orden de aparicion dentro de su categoria. */
    @Column(nullable = false)
    private Integer orden;
}

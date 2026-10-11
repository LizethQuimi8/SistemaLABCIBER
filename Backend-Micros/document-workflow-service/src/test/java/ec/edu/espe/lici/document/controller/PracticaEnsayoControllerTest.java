package ec.edu.espe.lici.document.controller;

import ec.edu.espe.lici.document.domain.PracticaEnsayo;
import ec.edu.espe.lici.document.repository.PracticaEnsayoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PracticaEnsayoControllerTest {

    private PracticaEnsayoRepository repository;
    private PracticaEnsayoController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        repository = mock(PracticaEnsayoRepository.class);
        controller = new PracticaEnsayoController(repository, storageDir.toString());
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(long userId, String rol) {
        Jwt jwt = new Jwt(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "RS256"),
                Map.of("sub", String.valueOf(userId), "roles", List.of(rol)));
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    private PracticaEnsayo practicaDe(Long id, Long responsableId) {
        return PracticaEnsayo.builder().id(id).titulo("Practica de pentesting").fecha(LocalDate.now())
                .responsableId(responsableId).descripcion("Desarrollo de la practica").build();
    }

    @Test
    void cualquierUsuarioVeTodasLasPracticas() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(repository.findAll()).thenReturn(List.of(practicaDe(1L, 5L), practicaDe(2L, 9L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void crearAsignaAutomaticamenteAlDocenteComoResponsable() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        PracticaEnsayo nueva = PracticaEnsayo.builder().titulo("Nueva").fecha(LocalDate.now())
                .descripcion("Desarrollo").responsableId(999L).build();
        when(repository.save(any(PracticaEnsayo.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nueva);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getResponsableId()).isEqualTo(7L);
    }

    @Test
    void crearRespetaElResponsableIndicadoCuandoLoCreaUnAdministrador() {
        authenticateAs(1L, "ADMINISTRADOR");
        PracticaEnsayo nueva = PracticaEnsayo.builder().titulo("Nueva").fecha(LocalDate.now())
                .descripcion("Desarrollo").responsableId(42L).build();
        when(repository.save(any(PracticaEnsayo.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nueva);

        assertThat(response.getBody().getResponsableId()).isEqualTo(42L);
    }

    @Test
    void unDocenteNoPuedeEditarLaPracticaDeOtroUsuario() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(practicaDe(1L, 99L)));
        PracticaEnsayo request = PracticaEnsayo.builder().titulo("Actualizada").fecha(LocalDate.now()).descripcion("x").build();

        assertThatThrownBy(() -> controller.actualizar(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void elResponsablePuedeEditarSuPropiaPractica() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(practicaDe(1L, 7L)));
        when(repository.save(any(PracticaEnsayo.class))).thenAnswer(inv -> inv.getArgument(0));
        PracticaEnsayo request = PracticaEnsayo.builder().titulo("Actualizada").fecha(LocalDate.now()).descripcion("Nueva desc").build();

        PracticaEnsayo actualizada = controller.actualizar(1L, request);

        assertThat(actualizada.getTitulo()).isEqualTo("Actualizada");
        assertThat(actualizada.getResponsableId()).isEqualTo(7L);
    }

    @Test
    void unAdministradorPuedeEditarCualquierPracticaYReasignarResponsable() {
        authenticateAs(1L, "ADMINISTRADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(practicaDe(1L, 7L)));
        when(repository.save(any(PracticaEnsayo.class))).thenAnswer(inv -> inv.getArgument(0));
        PracticaEnsayo request = PracticaEnsayo.builder().titulo("Actualizada").fecha(LocalDate.now())
                .descripcion("x").responsableId(42L).build();

        PracticaEnsayo actualizada = controller.actualizar(1L, request);

        assertThat(actualizada.getResponsableId()).isEqualTo(42L);
    }

    @Test
    void unUsuarioAjenoNoPuedeEliminarLaPractica() {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(practicaDe(1L, 99L)));

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);

        verify(repository, never()).delete(any());
    }

    @Test
    void subirArchivoGuardaElBinarioCuandoEsElResponsable() throws IOException {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(practicaDe(1L, 7L)));
        when(repository.save(any(PracticaEnsayo.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "informe.pdf", "application/pdf", "contenido".getBytes());

        PracticaEnsayo actualizada = controller.subirArchivo(1L, archivo);

        assertThat(actualizada.getArchivoNombreArchivo()).isEqualTo("informe.pdf");
        assertThat(storageDir.resolve(actualizada.getArchivoRuta())).exists();
    }

    @Test
    void descargarArchivoDevuelveElRecurso() throws IOException {
        authenticateAs(7L, "DOCENTE_INVESTIGADOR");
        when(repository.findById(1L)).thenReturn(Optional.of(practicaDe(1L, 7L)));
        when(repository.save(any(PracticaEnsayo.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "informe.pdf", "application/pdf", "contenido".getBytes());
        PracticaEnsayo subida = controller.subirArchivo(1L, archivo);
        when(repository.findById(1L)).thenReturn(Optional.of(subida));

        ResponseEntity<Resource> respuesta = controller.descargarArchivo(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getBody().exists()).isTrue();
    }
}

package ec.edu.espe.lici.academic.controller;

import ec.edu.espe.lici.academic.domain.Investigador;
import ec.edu.espe.lici.academic.repository.InvestigadorRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvestigadorControllerTest {

    private InvestigadorRepository investigadorRepository;
    private InvestigadorController controller;

    @TempDir
    Path storageDir;

    @BeforeEach
    void setUp() {
        investigadorRepository = mock(InvestigadorRepository.class);
        controller = new InvestigadorController(investigadorRepository, storageDir.toString());
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

    private Investigador investigadorDe(Long id, long usuarioId) {
        return Investigador.builder().id(id).usuarioId(usuarioId).nombreCompleto("Ada Lovelace").build();
    }

    @Test
    void listarEsPublicoParaCualquierUsuarioAutenticado() {
        authenticateAs(1L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findAll()).thenReturn(List.of(investigadorDe(1L, 5L), investigadorDe(2L, 9L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void crearUsaElUsuarioIdProvistoSinImportarQuienLoCrea() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador nuevo = Investigador.builder().nombreCompleto("Ada").usuarioId(999L).build();
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getUsuarioId()).isEqualTo(999L);
    }

    @Test
    void crearRechazaSinUsuarioIdIndicado() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador nuevo = Investigador.builder().nombreCompleto("Ada").build();

        assertThatThrownBy(() -> controller.crear(nuevo))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(investigadorRepository, never()).save(any());
    }

    @Test
    void unDocentePuedeEditarElPerfilDeOtro() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigadorDe(1L, 42L)));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        Investigador request = Investigador.builder().nombreCompleto("Otro nombre").build();

        Investigador actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getNombreCompleto()).isEqualTo("Otro nombre");
    }

    @Test
    void unAdministradorPuedeEditarCualquierPerfil() {
        authenticateAs(1L, "ADMINISTRADOR");
        Investigador existente = investigadorDe(1L, 42L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        Investigador request = Investigador.builder().nombreCompleto("Nombre actualizado").build();

        Investigador actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getNombreCompleto()).isEqualTo("Nombre actualizado");
    }

    @Test
    void unDocenteNoPuedeEliminarNiSuPropioPerfil() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigadorDe(1L, 5L)));

        assertThatThrownBy(() -> controller.eliminar(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(investigadorRepository, never()).delete(any());
    }

    @Test
    void unAdministradorSiPuedeEliminarCualquierPerfil() {
        authenticateAs(1L, "ADMINISTRADOR");
        Investigador existente = investigadorDe(1L, 42L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(existente));

        controller.eliminar(1L);

        verify(investigadorRepository).delete(existente);
    }

    @Test
    void subirCurriculumGuardaElBinarioYActualizaLosMetadatos() throws IOException {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador investigador = investigadorDe(1L, 5L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigador));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "hoja-de-vida.pdf", "application/pdf", "contenido".getBytes());

        Investigador actualizado = controller.subirCurriculum(1L, archivo);

        assertThat(actualizado.getCurriculumNombreArchivo()).isEqualTo("hoja-de-vida.pdf");
        assertThat(actualizado.getCurriculumContentType()).isEqualTo("application/pdf");
        assertThat(actualizado.getCurriculumRuta()).endsWith(".pdf");
        assertThat(storageDir.resolve(actualizado.getCurriculumRuta())).exists();
    }

    @Test
    void descargarCurriculumDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador investigador = investigadorDe(1L, 5L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigador));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "hoja-de-vida.pdf", "application/pdf", "contenido".getBytes());
        Investigador subido = controller.subirCurriculum(1L, archivo);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(subido));

        ResponseEntity<Resource> respuesta = controller.descargarCurriculum(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarCurriculumLanzaNotFoundSiNoSeHaSubidoNada() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigadorDe(1L, 5L)));

        assertThatThrownBy(() -> controller.descargarCurriculum(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void subirHorarioGuardaElBinarioYActualizaLosMetadatos() throws IOException {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador investigador = investigadorDe(1L, 5L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigador));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "horario.pdf", "application/pdf", "contenido".getBytes());

        Investigador actualizado = controller.subirHorario(1L, archivo);

        assertThat(actualizado.getHorarioNombreArchivo()).isEqualTo("horario.pdf");
        assertThat(actualizado.getHorarioContentType()).isEqualTo("application/pdf");
        assertThat(actualizado.getHorarioRuta()).endsWith(".pdf");
        assertThat(storageDir.resolve(actualizado.getHorarioRuta())).exists();
    }

    @Test
    void descargarHorarioDevuelveElRecursoConElContentTypeOriginal() throws IOException {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        Investigador investigador = investigadorDe(1L, 5L);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigador));
        when(investigadorRepository.save(any(Investigador.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "horario.pdf", "application/pdf", "contenido".getBytes());
        Investigador subido = controller.subirHorario(1L, archivo);
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(subido));

        ResponseEntity<Resource> respuesta = controller.descargarHorario(1L);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(respuesta.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(respuesta.getBody().exists()).isTrue();
    }

    @Test
    void descargarHorarioLanzaNotFoundSiNoSeHaSubidoNada() {
        authenticateAs(5L, "DOCENTE_INVESTIGADOR");
        when(investigadorRepository.findById(1L)).thenReturn(Optional.of(investigadorDe(1L, 5L)));

        assertThatThrownBy(() -> controller.descargarHorario(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}

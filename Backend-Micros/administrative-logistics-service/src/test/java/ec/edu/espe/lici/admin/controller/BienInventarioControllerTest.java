package ec.edu.espe.lici.admin.controller;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import ec.edu.espe.lici.admin.service.InventarioImportService;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BienInventarioControllerTest {

    private BienInventarioRepository repository;
    private BienInventarioController controller;

    @BeforeEach
    void setUp() {
        repository = mock(BienInventarioRepository.class);
        controller = new BienInventarioController(repository, new InventarioImportService(repository));
    }

    private BienInventario bienDe(Long id) {
        return BienInventario.builder().id(id).nombre("Laptop").estado(EstadoBien.DISPONIBLE).cantidad(1).build();
    }

    @Test
    void listarDevuelveTodosLosBienes() {
        when(repository.findAll()).thenReturn(List.of(bienDe(1L), bienDe(2L)));

        assertThat(controller.listar()).hasSize(2);
    }

    @Test
    void obtenerLanzaNotFoundCuandoNoExiste() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.obtener(1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void crearIgnoraElIdEnviadoEnElCuerpo() {
        BienInventario nuevo = BienInventario.builder().id(999L).nombre("Proyector").estado(EstadoBien.DISPONIBLE).build();
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = controller.crear(nuevo);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNull();
    }

    @Test
    void actualizarSobrescribeLosCamposEditables() {
        BienInventario existente = bienDe(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));
        BienInventario request = BienInventario.builder().nombre("Laptop actualizada")
                .estado(EstadoBien.EN_USO).cantidad(3).ubicacion("Lab 2").build();

        BienInventario actualizado = controller.actualizar(1L, request);

        assertThat(actualizado.getNombre()).isEqualTo("Laptop actualizada");
        assertThat(actualizado.getEstado()).isEqualTo(EstadoBien.EN_USO);
        assertThat(actualizado.getCantidad()).isEqualTo(3);
    }

    @Test
    void cambiarEstadoRechazaAsignarEnUsoManualmente() {
        when(repository.findById(1L)).thenReturn(Optional.of(bienDe(1L)));

        assertThatThrownBy(() -> controller.cambiarEstado(1L, EstadoBien.EN_USO))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(repository, never()).save(any());
    }

    @Test
    void cambiarEstadoRechazaModificarUnBienPrestado() {
        BienInventario prestado = BienInventario.builder().id(1L).nombre("Laptop").estado(EstadoBien.EN_USO).cantidad(1).build();
        when(repository.findById(1L)).thenReturn(Optional.of(prestado));

        assertThatThrownBy(() -> controller.cambiarEstado(1L, EstadoBien.MANTENIMIENTO))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(repository, never()).save(any());
    }

    @Test
    void cambiarEstadoActualizaElBienDisponible() {
        BienInventario disponible = bienDe(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(disponible));
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        BienInventario actualizado = controller.cambiarEstado(1L, EstadoBien.MANTENIMIENTO);

        assertThat(actualizado.getEstado()).isEqualTo(EstadoBien.MANTENIMIENTO);
    }

    @Test
    void importarCreaBienesNuevosDesdeLaMatrizDeExcel() throws Exception {
        when(repository.findByCodigoIC(any())).thenReturn(Optional.empty());
        when(repository.findByCodigoInventario(any())).thenReturn(List.of());
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile archivo = new MockMultipartFile("archivo", "matriz.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", matrizDeEjemplo());

        InventarioImportService.ImportResult resultado = controller.importar(archivo);

        assertThat(resultado.creados()).isEqualTo(2);
        assertThat(resultado.actualizados()).isZero();
        assertThat(resultado.errores()).isEmpty();
        verify(repository, times(2)).save(any(BienInventario.class));
    }

    @Test
    void importarActualizaUnBienExistenteSegunElCodigoIC() throws Exception {
        BienInventario existente = BienInventario.builder().id(5L).nombre("Rack viejo")
                .codigoIC("ESPE-001").estado(EstadoBien.DISPONIBLE).cantidad(1).build();
        when(repository.findByCodigoIC("ESPE-001")).thenReturn(Optional.of(existente));
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile archivo = new MockMultipartFile("archivo", "matriz.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", matrizDeEjemplo());

        InventarioImportService.ImportResult resultado = controller.importar(archivo);

        assertThat(resultado.actualizados()).isEqualTo(1);
        assertThat(resultado.creados()).isEqualTo(1);
        assertThat(existente.getNombre()).isEqualTo("Switch Cisco 24 puertos");
        assertThat(existente.getMarca()).isEqualTo("Cisco");
    }

    @Test
    void importarNoConfundeBienesDistintosQueComparteElMismoCodigoDeLaboratorio() throws Exception {
        // La matriz institucional a veces asigna el mismo codigo de laboratorio a varios
        // bienes de un mismo puesto (monitor + teclado + mouse), asi que no debe usarse
        // solo por si mismo para decidir que fila actualiza que bien.
        BienInventario monitorExistente = BienInventario.builder().id(1L).nombre("Monitor Dell")
                .codigoInventario("PCLC-3").estado(EstadoBien.DISPONIBLE).cantidad(1).build();
        when(repository.findByCodigoIC(any())).thenReturn(Optional.empty());
        when(repository.findByCodigoInventario("PCLC-3")).thenReturn(List.of(monitorExistente));
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile archivo = new MockMultipartFile("archivo", "matriz.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", matrizConCodigoLaboratorioCompartido());

        InventarioImportService.ImportResult resultado = controller.importar(archivo);

        assertThat(resultado.errores()).isEmpty();
        assertThat(resultado.creados()).isEqualTo(1);
        assertThat(monitorExistente.getNombre()).isEqualTo("Monitor Dell");
    }

    @Test
    void importarToleraUnaFilaDeTituloAntesDelEncabezado() throws Exception {
        when(repository.findByCodigoIC(any())).thenReturn(Optional.empty());
        when(repository.findByCodigoInventario(any())).thenReturn(List.of());
        when(repository.save(any(BienInventario.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile archivo = new MockMultipartFile("archivo", "matriz.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", matrizConFilaDeTitulo());

        InventarioImportService.ImportResult resultado = controller.importar(archivo);

        assertThat(resultado.creados()).isEqualTo(1);
        assertThat(resultado.errores()).isEmpty();
    }

    @Test
    void importarRechazaUnArchivoSinLaColumnaNombre() throws Exception {
        MockMultipartFile archivo = new MockMultipartFile("archivo", "matriz.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", matrizSinColumnaNombre());

        assertThatThrownBy(() -> controller.importar(archivo))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    private byte[] matrizDeEjemplo() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Inventario");
            escribirFila(sheet, 0, "Ord", "Nombre del Item", "Marca", "Descripcion", "Codigo de Bien ESPE",
                    "Numero de Serie", "Codigo Laboratorio", "Detalles tecnicos", "Estado", "Custodio", "Observacion");
            escribirFila(sheet, 1, "1", "Switch Cisco 24 puertos", "Cisco", "Switch administrable",
                    "ESPE-001", "SN123", "LAB-01", "24 puertos gigabit", "Disponible", "Ing. Gancino", "Ninguna");
            escribirFila(sheet, 2, "2", "Rack de piso", "Tripp Lite", "Rack 42U", "ESPE-002", "SN456",
                    "LAB-02", "42U", "Mantenimiento", "Ing. Roman", "");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private byte[] matrizConCodigoLaboratorioCompartido() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Inventario");
            escribirFila(sheet, 0, "Ord", "Nombre del Item", "Marca", "Descripcion", "Codigo de Bien ESPE",
                    "Numero de Serie", "Codigo Laboratorio", "Detalles tecnicos", "Estado", "Custodio", "Observacion");
            escribirFila(sheet, 1, "1", "Teclado", "Logitech", "", "", "", "PCLC-3", "", "Disponible", "Ing. Gancino", "");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private byte[] matrizConFilaDeTitulo() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Inventario");
            escribirFila(sheet, 0, "UNIVERSIDAD DE LAS FUERZAS ARMADAS ESPE - MATRIZ DE INVENTARIO LICI");
            escribirFila(sheet, 1);
            escribirFila(sheet, 2, "Ord", "Nombre del Item", "Marca", "Descripcion", "Codigo de Bien ESPE",
                    "Numero de Serie", "Codigo Laboratorio", "Detalles tecnicos", "Estado", "Custodio", "Observacion");
            escribirFila(sheet, 3, "1", "Access Point Ubiquiti", "Ubiquiti", "AP indoor",
                    "ESPE-010", "SN789", "LAB-10", "Wifi 6", "Disponible", "Ing. Bustos", "");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private byte[] matrizSinColumnaNombre() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Inventario");
            escribirFila(sheet, 0, "Ord", "Marca", "Estado");
            escribirFila(sheet, 1, "1", "Cisco", "Disponible");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void escribirFila(XSSFSheet sheet, int indice, String... valores) {
        var fila = sheet.createRow(indice);
        for (int i = 0; i < valores.length; i++) {
            fila.createCell(i).setCellValue(valores[i]);
        }
    }

    @Test
    void eliminarLanzaNotFoundCuandoNoExiste() {
        when(repository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> controller.eliminar(1L)).isInstanceOf(ResponseStatusException.class);

        verify(repository, never()).deleteById(any());
    }
}

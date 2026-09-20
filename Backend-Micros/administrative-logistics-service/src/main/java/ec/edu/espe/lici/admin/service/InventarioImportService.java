package ec.edu.espe.lici.admin.service;

import ec.edu.espe.lici.admin.domain.BienInventario;
import ec.edu.espe.lici.admin.domain.EstadoBien;
import ec.edu.espe.lici.admin.repository.BienInventarioRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Importa la matriz institucional de inventario (Excel) generando o
 * actualizando BienInventario. Las columnas se detectan por su encabezado
 * (no por posicion), asi que toleran reordenamientos de la matriz original:
 * Ord | Nombre del Item | Marca | Descripcion | Codigo de Bien ESPE |
 * Numero de Serie | Codigo Laboratorio | Detalles tecnicos | Estado |
 * Custodio | Observacion.
 *
 * El emparejamiento para decidir si una fila crea o actualiza un bien usa,
 * en orden de preferencia, el Codigo de Bien ESPE y luego el Codigo
 * Laboratorio, para que reimportar la misma matriz con cambios no duplique
 * los bienes ya cargados.
 */
@Service
public class InventarioImportService {

    private final BienInventarioRepository bienInventarioRepository;

    public InventarioImportService(BienInventarioRepository bienInventarioRepository) {
        this.bienInventarioRepository = bienInventarioRepository;
    }

    public ImportResult importar(MultipartFile archivo) throws IOException {
        int creados = 0;
        int actualizados = 0;
        List<String> errores = new ArrayList<>();
        Set<String> estadosNoReconocidos = new LinkedHashSet<>();

        try (InputStream in = archivo.getInputStream(); Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            int filaEncabezado = detectarFilaEncabezado(sheet, formatter);
            if (filaEncabezado < 0) {
                throw new IllegalArgumentException(
                        "No se encontro una fila con la columna 'Nombre del Item' entre las primeras filas del archivo");
            }
            Row headerRow = sheet.getRow(filaEncabezado);
            Map<String, Integer> columnas = new HashMap<>();
            for (Cell cell : headerRow) {
                String encabezado = normalizar(formatter.formatCellValue(cell));
                if (!encabezado.isBlank()) {
                    columnas.put(encabezado, cell.getColumnIndex());
                }
            }

            Integer colNombre = buscarColumnaNombre(columnas);
            if (colNombre == null) {
                throw new IllegalArgumentException(
                        "No se encontro la columna 'Nombre del Item'. Encabezados detectados: " + String.join(", ", columnas.keySet()));
            }
            Integer colMarca = buscarColumna(columnas, "marca");
            Integer colDescripcion = buscarColumna(columnas, "descripcion");
            Integer colCodigoIC = buscarColumna(columnas, "codigo de bien espe");
            Integer colNumeroSerie = buscarColumna(columnas, "numero de serie");
            Integer colCodigoLab = buscarColumna(columnas, "codigo laboratorio");
            Integer colDetalles = buscarColumna(columnas, "detalles tecnicos");
            Integer colEstado = buscarColumna(columnas, "estado");
            Integer colCustodio = buscarColumna(columnas, "custodio");
            Integer colObservacion = buscarColumna(columnas, "observacion");

            for (int r = filaEncabezado + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String nombre = valor(row, colNombre, formatter);
                if (nombre.isBlank()) continue; // fila vacia, se ignora silenciosamente

                String codigoIC = valor(row, colCodigoIC, formatter);
                String codigoLab = valor(row, colCodigoLab, formatter);

                BienInventario bien = null;
                if (!codigoIC.isBlank()) {
                    bien = bienInventarioRepository.findByCodigoIC(codigoIC).orElse(null);
                }
                if (bien == null && !codigoLab.isBlank()) {
                    // El codigo de laboratorio puede repetirse entre varios bienes de un
                    // mismo puesto (p. ej. monitor + teclado + mouse); se desambigua por nombre.
                    String nombreNormalizado = normalizar(nombre);
                    bien = bienInventarioRepository.findByCodigoInventario(codigoLab).stream()
                            .filter(candidato -> normalizar(candidato.getNombre()).equals(nombreNormalizado))
                            .findFirst()
                            .orElse(null);
                }
                boolean esNuevo = bien == null;
                if (esNuevo) {
                    bien = new BienInventario();
                    bien.setCantidad(1);
                }

                bien.setNombre(nombre);
                if (!codigoIC.isBlank()) bien.setCodigoIC(codigoIC);
                if (!codigoLab.isBlank()) bien.setCodigoInventario(codigoLab);
                bien.setMarca(vacioComoNull(valor(row, colMarca, formatter)));
                bien.setDescripcion(vacioComoNull(valor(row, colDescripcion, formatter)));
                bien.setNumeroSerie(vacioComoNull(valor(row, colNumeroSerie, formatter)));
                bien.setDetallesTecnicos(vacioComoNull(valor(row, colDetalles, formatter)));
                bien.setCustodio(vacioComoNull(valor(row, colCustodio, formatter)));
                bien.setObservaciones(vacioComoNull(valor(row, colObservacion, formatter)));

                String estadoTexto = valor(row, colEstado, formatter);
                EstadoBien estado = mapearEstado(estadoTexto);
                if (estado != null) {
                    bien.setEstado(estado);
                } else {
                    if (!estadoTexto.isBlank()) estadosNoReconocidos.add(estadoTexto);
                    if (bien.getEstado() == null) bien.setEstado(EstadoBien.DISPONIBLE);
                }

                try {
                    bienInventarioRepository.save(bien);
                    if (esNuevo) creados++; else actualizados++;
                } catch (RuntimeException ex) {
                    errores.add("Fila " + (r + 1) + " (" + nombre + "): " + ex.getMessage());
                }
            }
        }

        return new ImportResult(creados, actualizados, errores, new ArrayList<>(estadosNoReconocidos));
    }

    /**
     * Busca, entre las primeras filas de la hoja, la fila que contiene una
     * celda compatible con "Nombre del Item" (tolera filas de titulo/banner
     * institucional por encima de los encabezados reales).
     */
    private int detectarFilaEncabezado(Sheet sheet, DataFormatter formatter) {
        int limite = Math.min(sheet.getLastRowNum(), sheet.getFirstRowNum() + 20);
        for (int r = sheet.getFirstRowNum(); r <= limite; r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            for (Cell cell : row) {
                String texto = normalizar(formatter.formatCellValue(cell));
                if (texto.contains("nombre") && (texto.contains("item") || texto.contains("bien"))) {
                    return r;
                }
            }
        }
        return -1;
    }

    /** Igual que detectarFilaEncabezado, pero ya sobre el mapa de encabezados de una fila candidata. */
    private Integer buscarColumnaNombre(Map<String, Integer> columnas) {
        for (Map.Entry<String, Integer> entry : columnas.entrySet()) {
            String clave = entry.getKey();
            if (clave.contains("nombre") && (clave.contains("item") || clave.contains("bien"))) {
                return entry.getValue();
            }
        }
        return null;
    }

    /** Busca una columna por coincidencia exacta y, si no la encuentra, por
     * coincidencia parcial (tolera prefijos/sufijos como numeracion o texto extra). */
    private Integer buscarColumna(Map<String, Integer> columnas, String clave) {
        Integer directo = columnas.get(clave);
        if (directo != null) return directo;
        for (Map.Entry<String, Integer> entry : columnas.entrySet()) {
            if (entry.getKey().contains(clave)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private String valor(Row row, Integer columna, DataFormatter formatter) {
        if (columna == null) return "";
        Cell cell = row.getCell(columna);
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }

    private String vacioComoNull(String valor) {
        return valor.isBlank() ? null : valor;
    }

    /** Heuristica de texto libre -> EstadoBien; null si no se reconoce ningun termino conocido. */
    private EstadoBien mapearEstado(String textoOriginal) {
        String texto = normalizar(textoOriginal);
        if (texto.isBlank()) return null;
        if (texto.contains("baja") || texto.contains("inservible") || texto.contains("obsoleto") || texto.contains("danado")) {
            return EstadoBien.DE_BAJA;
        }
        if (texto.contains("mantenimiento") || texto.contains("reparacion")) {
            return EstadoBien.MANTENIMIENTO;
        }
        if (texto.contains("uso") || texto.contains("asignado") || texto.contains("ocupado") || texto.contains("prestamo")) {
            return EstadoBien.EN_USO;
        }
        if (texto.contains("disponible") || texto.contains("bueno") || texto.contains("operativo") || texto.contains("activo")) {
            return EstadoBien.DISPONIBLE;
        }
        return null;
    }

    private String normalizar(String texto) {
        if (texto == null) return "";
        String sinAcentos = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinAcentos.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    public record ImportResult(int creados, int actualizados, List<String> errores, List<String> estadosNoReconocidos) {
    }
}

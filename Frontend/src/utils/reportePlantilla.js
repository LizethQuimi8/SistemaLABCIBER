/** Encabezado institucional compartido (ESPE + sello del LICI) para todos los
 * reportes imprimibles del sistema, con el mismo diseño ya usado en las
 * Actas de Entrega/Devolución de Inventario. */

function logosReporte() {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  return { espeLogoUrl: `${base}espe-logo.png`, liciLogoUrl: `${base}lici-sello.jpg` }
}

/** Bloque <style> con las reglas del encabezado; se concatena con el CSS propio de cada reporte. */
export function estiloEncabezadoReporte() {
  return `
    @page{margin:0}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:32px 32px 110px;color:#1a1a1a}
    .encabezado-reporte{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:3px solid #0e6b3c;padding-bottom:14px;margin-bottom:20px}
    .encabezado-reporte .institucion{font-size:10.5px;letter-spacing:0.4px;color:#777;text-transform:uppercase;margin:0 0 4px}
    .encabezado-reporte h1{font-size:19px;color:#052a18;margin:0}
    .encabezado-reporte img{height:58px;width:auto;object-fit:contain;flex-shrink:0}
    .encabezado-reporte .logo-lici{height:120px;border-radius:50%}
    .encabezado-reporte .centro{flex:1;text-align:center}
    .subinfo-reporte{font-size:11.5px;color:#555;margin:0 0 18px;text-align:center}
    .firmas-reporte{position:fixed;bottom:40px;left:32px;right:32px;display:flex;justify-content:center;gap:60px;page-break-inside:avoid}
    .firmas-reporte div{text-align:center;border-top:1px solid #333;padding-top:8px;font-size:11px;color:#333;min-width:200px}
  `
}

/** Bloque <div> del encabezado en si, con los dos logos y el titulo del reporte.
 * `subinfo` (opcional) es una linea chica debajo (fecha, filtros aplicados, totales). */
export function htmlEncabezadoReporte(titulo, subinfo) {
  const { espeLogoUrl, liciLogoUrl } = logosReporte()
  return `
    <div class="encabezado-reporte">
      <img src="${espeLogoUrl}" alt="Universidad de las Fuerzas Armadas ESPE" />
      <div class="centro">
        <p class="institucion">Universidad de las Fuerzas Armadas ESPE — Laboratorio de Investigación de Ciberseguridad</p>
        <h1>${titulo}</h1>
      </div>
      <img class="logo-lici" src="${liciLogoUrl}" alt="Laboratorio de Investigación de Ciberseguridad" />
    </div>
    ${subinfo ? `<p class="subinfo-reporte">${subinfo}</p>` : ''}
  `
}

/** Pie de firmas al final del reporte. `firmantes` es un arreglo de etiquetas
 * (ej. ['Jefe de Laboratorio'] o ['Jefe de Laboratorio', 'Admin. Infraestructura']). */
export function htmlFirmasReporte(firmantes) {
  return `
    <div class="firmas-reporte">
      ${firmantes.map((f) => `<div>${f}</div>`).join('')}
    </div>
  `
}

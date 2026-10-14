#!/usr/bin/env bash
# Exporta todas las imagenes Docker ya construidas (los 7 servicios + mysql)
# a archivos .tar.gz, para llevarlas a un servidor nuevo SIN internet y sin
# tener que reconstruirlas desde el codigo fuente (no hace falta Java, Maven,
# Node ni acceso a internet en la maquina nueva para esto).
#
# Uso: ./scripts/export-images.sh
# Genera: image-exports/<fecha>/*.tar.gz  (varios cientos de MB en total)
#
# Se usa junto con backup.sh (que exporta las bases de datos y los archivos
# subidos) para tener una migracion completa sin reconstruir nada.
set -euo pipefail
cd "$(dirname "$0")/.."

FECHA=$(date +%Y%m%d-%H%M%S)
DESTINO="image-exports/${FECHA}"
mkdir -p "$DESTINO"

IMAGENES=(
  lici-backend-core-security-users-service:latest
  lici-backend-core-academic-research-service:latest
  lici-backend-document-workflow-service:latest
  lici-backend-administrative-logistics-service:latest
  lici-backend-reporting-service:latest
  lici-backend-api-gateway:latest
  lici-backend-frontend:latest
  mysql:8.0
)

echo "== Exportando imagenes =="
for img in "${IMAGENES[@]}"; do
  archivo="$DESTINO/$(echo "$img" | tr '/:' '__').tar.gz"
  if docker image inspect "$img" >/dev/null 2>&1; then
    echo "  - $img"
    docker save "$img" | gzip > "$archivo"
  else
    echo "  - $img (no existe localmente, se omite; corre 'docker compose build' primero si falta)"
  fi
done

echo ""
echo "Listo. Imagenes exportadas en: $DESTINO"
du -sh "$DESTINO"
echo ""
echo "Copia esa carpeta (junto con la carpeta de backups/<fecha> del respaldo de datos)"
echo "al servidor nuevo y ahi corre:"
echo "  ./scripts/import-images.sh $DESTINO"

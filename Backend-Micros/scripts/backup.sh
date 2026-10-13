#!/usr/bin/env bash
# Respalda TODO lo que no vive en git: las 4 bases de datos MySQL, las carpetas
# de archivos subidos (prestamos, documentos, planificacion, etc.), el .env y
# las llaves JWT. Uso: ./scripts/backup.sh
#
# El resultado es una carpeta backups/<fecha> lista para copiar a un USB o
# enviar al servidor nuevo. Para restaurarla ahi, usa restore.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1  # evita que Git Bash en Windows "traduzca" las rutas dentro de -v

PROJECT="lici-backend"
FECHA=$(date +%Y%m%d-%H%M%S)
DESTINO="backups/${FECHA}"
mkdir -p "$DESTINO/db" "$DESTINO/files"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
else
  echo "No se encontro .env en Backend-Micros/. Abortando." >&2
  exit 1
fi

echo "== Respaldando bases de datos =="
declare -A DBS=(
  [mysql-auth]=lici_auth
  [mysql-academic]=lici_academic
  [mysql-document]=lici_document
  [mysql-admin]=lici_admin
)
for servicio in "${!DBS[@]}"; do
  bd="${DBS[$servicio]}"
  contenedor="${PROJECT}-${servicio}-1"
  echo "  - $bd ($contenedor)"
  docker exec "$contenedor" sh -c "mysqldump -u root -p'${DB_ROOT_PASSWORD}' --default-character-set=utf8mb4 --single-transaction '${bd}'" > "$DESTINO/db/${bd}.sql"
done

echo "== Respaldando carpetas de archivos (volumenes Docker) =="
VOLUMENES=(
  documentos_files
  curriculums_files
  compras_files
  manuales_files
  prestamos_files
  proyectos_files
  planificacion_files
  mantenimientos_files
  cyberrange_files
  practicas_files
)
for vol in "${VOLUMENES[@]}"; do
  nombre_completo="${PROJECT}_${vol}"
  if docker volume inspect "$nombre_completo" >/dev/null 2>&1; then
    echo "  - $vol"
    docker run --rm -v "${nombre_completo}:/data:ro" -v "$(pwd)/$DESTINO/files:/backup" alpine \
      sh -c "tar czf /backup/${vol}.tar.gz -C /data ."
  else
    echo "  - $vol (no existe, se omite)"
  fi
done

echo "== Copiando configuracion (.env y llaves JWT) =="
cp .env "$DESTINO/.env"
if [ -d secrets ]; then
  cp -r secrets "$DESTINO/secrets"
fi

echo ""
echo "Listo. Respaldo completo en: $DESTINO"
echo "Copia esa carpeta completa (por USB, red, etc.) al servidor nuevo y ahi corre:"
echo "  ./scripts/restore.sh $DESTINO"

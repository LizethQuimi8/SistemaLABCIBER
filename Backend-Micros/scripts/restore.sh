#!/usr/bin/env bash
# Restaura un respaldo generado por backup.sh en un servidor nuevo.
# Uso: ./scripts/restore.sh backups/20260101-120000
#
# Requisitos previos en el servidor nuevo:
#   1. Tener Docker y Docker Compose instalados.
#   2. Haber clonado el repositorio (git clone ...) y estar parado en
#      Backend-Micros/.
#   3. Haber copiado la carpeta de respaldo (generada por backup.sh en la
#      maquina vieja) a algun lugar accesible, por ejemplo junto a este script.
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1  # evita que Git Bash en Windows "traduzca" las rutas dentro de -v

ORIGEN="${1:-}"
if [ -z "$ORIGEN" ] || [ ! -d "$ORIGEN" ]; then
  echo "Uso: $0 <carpeta-de-respaldo>  (ej: backups/20260101-120000)" >&2
  exit 1
fi

PROJECT="lici-backend"

echo "== Restaurando configuracion (.env y llaves JWT) =="
if [ -f "$ORIGEN/.env" ]; then
  cp "$ORIGEN/.env" .env
  echo "  .env copiado"
else
  echo "  ADVERTENCIA: no hay .env en el respaldo, usa .env.example como base" >&2
fi
if [ -d "$ORIGEN/secrets" ]; then
  cp -r "$ORIGEN/secrets" .
  echo "  secrets/ copiado"
fi

# shellcheck disable=SC1091
source .env

echo "== Creando volumenes y restaurando carpetas de archivos =="
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
  tar_file="$ORIGEN/files/${vol}.tar.gz"
  if [ -f "$tar_file" ]; then
    echo "  - $vol"
    docker volume create "$nombre_completo" >/dev/null
    docker run --rm -v "${nombre_completo}:/data" -v "$(pwd)/$tar_file:/backup.tar.gz:ro" alpine \
      sh -c "tar xzf /backup.tar.gz -C /data"
  else
    echo "  - $vol (no hay respaldo, se omite)"
  fi
done

echo "== Levantando las bases de datos para poder restaurarlas =="
docker compose up -d mysql-auth mysql-academic mysql-document mysql-admin
echo "  esperando a que esten saludables..."
for servicio in mysql-auth mysql-academic mysql-document mysql-admin; do
  contenedor="${PROJECT}-${servicio}-1"
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$contenedor" 2>/dev/null)" = "healthy" ]; do
    sleep 3
  done
done

echo "== Restaurando bases de datos =="
declare -A DBS=(
  [mysql-auth]=lici_auth
  [mysql-academic]=lici_academic
  [mysql-document]=lici_document
  [mysql-admin]=lici_admin
)
for servicio in "${!DBS[@]}"; do
  bd="${DBS[$servicio]}"
  contenedor="${PROJECT}-${servicio}-1"
  sql_file="$ORIGEN/db/${bd}.sql"
  if [ -f "$sql_file" ]; then
    echo "  - $bd"
    docker cp "$sql_file" "$contenedor:/tmp/restore.sql"
    docker exec "$contenedor" sh -c "mysql -u root -p'${DB_ROOT_PASSWORD}' --default-character-set=utf8mb4 '${bd}' < /tmp/restore.sql"
  else
    echo "  - $bd (no hay respaldo, se omite)"
  fi
done

echo "== Levantando todos los servicios =="
IMAGENES_FALTANTES=0
for img in lici-backend-core-security-users-service lici-backend-core-academic-research-service \
           lici-backend-document-workflow-service lici-backend-administrative-logistics-service \
           lici-backend-reporting-service lici-backend-api-gateway lici-backend-frontend; do
  docker image inspect "${img}:latest" >/dev/null 2>&1 || IMAGENES_FALTANTES=1
done
if [ "$IMAGENES_FALTANTES" = "1" ]; then
  echo "  (no estan todas las imagenes ya cargadas, se construyen desde el codigo fuente)"
  docker compose build
else
  echo "  (las imagenes ya estan cargadas, por ejemplo via import-images.sh; no se reconstruyen)"
fi
docker compose up -d

echo ""
echo "Listo. Verifica con:"
echo "  docker exec ${PROJECT}-api-gateway-1 wget -qO- http://core-security-users-service:8081/actuator/health"

#!/usr/bin/env bash
# Carga en Docker las imagenes exportadas por export-images.sh, en un
# servidor nuevo que tiene Docker instalado pero no tiene por que tener
# internet, ni el codigo fuente, ni Java/Maven/Node.
#
# Uso: ./scripts/import-images.sh image-exports/20261014-120000
#
# Despues de esto, "docker compose up -d" en Backend-Micros/ ya puede
# levantar todo usando estas imagenes (no las reconstruye porque ya
# existen localmente con el mismo nombre:tag).
set -euo pipefail

ORIGEN="${1:-}"
if [ -z "$ORIGEN" ] || [ ! -d "$ORIGEN" ]; then
  echo "Uso: $0 <carpeta-con-las-imagenes>  (ej: image-exports/20261014-120000)" >&2
  exit 1
fi

echo "== Cargando imagenes en Docker =="
for archivo in "$ORIGEN"/*.tar.gz; do
  [ -e "$archivo" ] || continue
  echo "  - $(basename "$archivo")"
  gunzip -c "$archivo" | docker load
done

echo ""
echo "Listo. Imagenes cargadas:"
docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "lici-backend|mysql" | sort

echo ""
echo "Ahora podes levantar todo sin reconstruir (ya existen las imagenes):"
echo "  cd Backend-Micros && docker compose up -d"

#!/usr/bin/env bash
set -euo pipefail

# Automated helper to build Iran MBTiles locally via OpenMapTiles quickstart.
# Requirements: docker, docker compose, enough disk/CPU (several GB), network access.
#
# Usage:
#   ./scripts/build-iran-tiles.sh
# Output:
#   ./maps/iran.mbtiles (copied from openmaptiles/data/tiles.mbtiles)
#
# Note: This clones openmaptiles into a temp dir, downloads the Iran PBF (Geofabrik),
# and runs ./quickstart.sh iran. It can take a long time and download large docker images.

ROOT_DIR="$(pwd)"
TARGET_DIR="${MAP_TILES_PATH:-${ROOT_DIR}/maps}"
TARGET_NAME="${TARGET_NAME:-iran.mbtiles}"
TARGET_PATH="${TARGET_DIR%/}/${TARGET_NAME}"

WORKDIR="$(mktemp -d)"
cleanup() {
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

echo "Building Iran MBTiles into ${TARGET_PATH}"
echo "Working in ${WORKDIR}"

git clone --depth=1 https://github.com/openmaptiles/openmaptiles "${WORKDIR}/openmaptiles"
cd "${WORKDIR}/openmaptiles"

OMT_PG_PORT="${OMT_POSTGRES_PORT:-55432}"
echo "DOWNLOAD_PBF_REGION=iran" >> .env
echo "POSTGRES_PORT=${OMT_PG_PORT}" >> .env
echo "PGPORT=${OMT_PG_PORT}" >> .env
echo "Building tiles (this will take a while)..."
./quickstart.sh iran

mkdir -p "${TARGET_DIR}"
cp data/tiles.mbtiles "${TARGET_PATH}"
echo "Done. MBTiles available at ${TARGET_PATH}"

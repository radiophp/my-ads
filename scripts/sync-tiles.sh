#!/usr/bin/env bash
set -euo pipefail

# Sync Iran MBTiles to the expected path for tileserver (dev or prod).
# Usage:
#   MBTILES_URL="https://<your-domain>/iran.mbtiles" ./scripts/sync-tiles.sh
# Optional: MAP_TILES_PATH (defaults to ./maps) and TARGET_NAME (defaults to iran.mbtiles)

URL="${MBTILES_URL:-}"
TARGET_DIR="${MAP_TILES_PATH:-./maps}"
TARGET_NAME="${TARGET_NAME:-iran.mbtiles}"
TARGET_PATH="${TARGET_DIR%/}/${TARGET_NAME}"

if [[ -z "${URL}" ]]; then
  echo "MBTILES_URL is required (e.g., export MBTILES_URL=https://your-domain/iran.mbtiles)" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

echo "Syncing tiles to ${TARGET_PATH} ..."
MBTILES_URL="${URL}" "$(dirname "$0")/get-iran-mbtiles.sh" "${TARGET_PATH}"

#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   MBTILES_URL="https://<your-domain>/iran.mbtiles" ./scripts/get-iran-mbtiles.sh [target_path]
# Defaults to ./maps/iran.mbtiles. Uses curl with progress and writes atomically.

TARGET_PATH="${1:-./maps/iran.mbtiles}"
URL="${MBTILES_URL:-}"

if [[ -z "${URL}" ]]; then
  echo "MBTILES_URL is required (e.g., export MBTILES_URL=https://.../iran.mbtiles)" >&2
  exit 1
fi

mkdir -p "$(dirname "${TARGET_PATH}")"
TMP_FILE="${TARGET_PATH}.partial"

echo "Downloading Iran MBTiles to ${TARGET_PATH} ..."
curl -L --fail --progress-bar -o "${TMP_FILE}" "${URL}"
mv "${TMP_FILE}" "${TARGET_PATH}"
echo "Done."

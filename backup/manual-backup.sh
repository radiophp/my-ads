#!/bin/bash
set -e

cd "$(dirname "$0")/.." || exit 1

test -f .env || { echo "Missing .env"; exit 1; }

env_raw=$(tr -d '\r' < .env)

db_url=$(echo "$env_raw" | grep '^DATABASE_URL=' | head -1 | cut -d= -f2-)
node_env=$(echo "$env_raw" | grep '^NODE_ENV=' | head -1 | cut -d= -f2-)

test -n "$db_url" || { echo "DATABASE_URL not found in .env"; exit 1; }

prefix="${node_env:-development}"
case "$prefix" in
  development) prefix="dev" ;;
  production)  prefix="prod" ;;
esac

url="${db_url%%\?*}"

file="backup/${prefix}-my-ads-$(date +%Y%m%d_%H%M%S).dump"

echo "Dumping database to $file ..."
pg_dump -Fc -v "$url" -f "$file" 2>&1
echo ""
echo "Done — Saved: $file"

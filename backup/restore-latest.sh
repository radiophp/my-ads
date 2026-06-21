#!/bin/bash
set -e

BACKUP_DIR="/home/mohmmad/Backups"

shopt -s nullglob
FILES=("$BACKUP_DIR"/*.dump)

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No .dump files found in $BACKUP_DIR"
  exit 1
fi

# Sort by modification time (newest first)
IFS=$'\n' SORTED=($(ls -1t "${FILES[@]}"))
unset IFS

echo "Available backups:"
echo ""

for i in "${!SORTED[@]}"; do
  f="${SORTED[$i]}"
  size=$(du -h "$f" | cut -f1)
  mtime=$(date -r "$f" "+%Y-%m-%d %H:%M:%S")
  name=$(basename "$f")
  default=""
  if [ "$i" -eq 0 ]; then
    default="  (default)"
  fi
  echo "  $((i+1)). $name  ($size, $mtime)$default"
done

echo ""
read -r -p "Select a backup to restore [1-${#SORTED[@]}] (default 1): " CHOICE
CHOICE="${CHOICE:-1}"

if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#SORTED[@]}" ]; then
  echo "Invalid choice. Exiting."
  exit 1
fi

SELECTED="${SORTED[$((CHOICE-1))]}"
echo ""
echo "Restoring: $(basename "$SELECTED")"
PGPASSWORD=postgres pg_restore --clean --if-exists --no-owner --no-acl -v \
  -h host.docker.internal -p 6201 -U postgres -d my_ads "$SELECTED"
echo ""
echo "Done"

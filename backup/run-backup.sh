#!/usr/bin/env bash
set -euo pipefail

STANZA="${PGBACKREST_STANZA:-my-ads}"
CIPHER_PASS="Ghader"
BACKUP_BUCKET="db-backup"
REPO_PATH="${PGBACKREST_REPO1_PATH:-/pgbackrest}"
REPO_PATH="${REPO_PATH#/}"

current_step="init"

log() {
  printf '%s [pgbackrest-backup] %s\n' "$(date -Iseconds)" "$*"
}

require_env() {
  local missing=0
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      log "Missing required env: ${name}"
      missing=1
    fi
  done
  if [ "$missing" -ne 0 ]; then
    exit 1
  fi
}

send_message() {
  local chat_id="$1"
  local text="$2"
  local response
  response="$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${chat_id}" \
    -d "disable_web_page_preview=true" \
    --data-urlencode "text=${text}")"
  if ! echo "$response" | jq -e '.ok == true' >/dev/null 2>&1; then
    log "Telegram sendMessage failed for chat ${chat_id}: ${response}"
    return 1
  fi
}

send_document() {
  local chat_id="$1"
  local file_path="$2"
  local caption="$3"
  local response
  response="$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
    -F "chat_id=${chat_id}" \
    -F "document=@${file_path}" \
    --data-urlencode "caption=${caption}")"
  if ! echo "$response" | jq -e '.ok == true' >/dev/null 2>&1; then
    log "Telegram sendDocument failed for chat ${chat_id}: ${response}"
    return 1
  fi
}

normalize_phones() {
  local raw="$1"
  local cleaned
  cleaned="$(echo "$raw" | tr ',;' ' ' | tr -s ' ')"
  for phone in $cleaned; do
    phone="${phone// /}"
    if [ -z "$phone" ]; then
      continue
    fi
    echo "$phone"
    if [[ "$phone" == +98* ]]; then
      echo "0${phone:3}"
    elif [[ "$phone" == 09* ]]; then
      echo "+98${phone:1}"
    fi
  done | awk 'NF && !seen[$0]++'
}

resolve_chat_ids() {
  local phones=("$@")
  if [ ${#phones[@]} -eq 0 ]; then
    return 0
  fi
  local sql_list
  sql_list="$(printf "'%s'," "${phones[@]}")"
  sql_list="${sql_list%,}"
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -Atc "select distinct \"chatId\" from \"TelegramUserLink\" where phone in (${sql_list});"
}

notify_all() {
  local text="$1"
  if [ ${#CHAT_IDS[@]} -eq 0 ]; then
    return 0
  fi
  for chat_id in "${CHAT_IDS[@]}"; do
    send_message "$chat_id" "$text" || true
  done
}

notify_error() {
  local text="$1"
  notify_all "Backup failed: ${text}"
}

on_error() {
  local exit_code=$?
  notify_error "step=${current_step} exit=${exit_code}"
  exit "$exit_code"
}

trap 'on_error' ERR

require_env MINIO_ENDPOINT MINIO_PORT MINIO_ACCESS_KEY MINIO_SECRET_KEY TELEGRAM_BOT_TOKEN POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-${POSTGRES_INTERNAL_PORT:-5432}}"

PHONE_LIST="${BACKUP_TELEGRAM_PHONES:-+989038923989,+989195043739}"
mapfile -t PHONE_VARIANTS < <(normalize_phones "$PHONE_LIST")
mapfile -t CHAT_IDS < <(resolve_chat_ids "${PHONE_VARIANTS[@]}" || true)
if [ ${#CHAT_IDS[@]} -eq 0 ]; then
  log "No Telegram chat IDs resolved for backup recipients."
fi

current_step="telegram-start"
notify_all "Backup starting: stanza=${STANZA}"

current_step="minio-setup"
MINIO_SCHEME="http"
if [ "${MINIO_USE_SSL:-false}" = "true" ]; then
  MINIO_SCHEME="https"
fi
mc alias set backup "${MINIO_SCHEME}://${MINIO_ENDPOINT}:${MINIO_PORT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null
mc mb --ignore-existing "backup/${BACKUP_BUCKET}" >/dev/null
mc anonymous set none "backup/${BACKUP_BUCKET}" >/dev/null || true

PGBACKREST_ARGS=(
  "--stanza=${STANZA}"
  "--repo1-cipher-type=aes-256-cbc"
  "--repo1-cipher-pass=${CIPHER_PASS}"
  "--log-level-console=info"
)

current_step="stanza-create"
if ! pgbackrest "${PGBACKREST_ARGS[@]}" info >/dev/null 2>&1; then
  pgbackrest "${PGBACKREST_ARGS[@]}" stanza-create
fi

current_step="backup"
pgbackrest "${PGBACKREST_ARGS[@]}" --type=full backup

current_step="expire"
pgbackrest "${PGBACKREST_ARGS[@]}" expire

current_step="collect-files"
BACKUP_LABEL="$(pgbackrest "${PGBACKREST_ARGS[@]}" info --output=json | jq -r --arg stanza "${STANZA}" '.[] | select(.name == $stanza) | .backup[-1].label // empty')"
if [ -z "$BACKUP_LABEL" ]; then
  log "Failed to resolve backup label."
  exit 1
fi

OBJECT_PREFIX="${REPO_PATH}/backup/${STANZA}/${BACKUP_LABEL}"
mapfile -t OBJECT_KEYS < <(mc ls --recursive --json "backup/${BACKUP_BUCKET}/${OBJECT_PREFIX}" | jq -r 'select(.type=="file") | (.key // .name)' | awk 'NF && !seen[$0]++')

if [ ${#OBJECT_KEYS[@]} -eq 0 ]; then
  log "No backup objects found for label ${BACKUP_LABEL}."
  exit 1
fi

current_step="send-files"
notify_all "Backup completed: ${BACKUP_LABEL}. Uploading ${#OBJECT_KEYS[@]} file(s) via Telegram."

tmp_dir="$(mktemp -d)"
for object_key in "${OBJECT_KEYS[@]}"; do
  filename="$(basename "$object_key")"
  mc cp "backup/${BACKUP_BUCKET}/${object_key}" "${tmp_dir}/${filename}" >/dev/null
  for chat_id in "${CHAT_IDS[@]}"; do
    send_document "$chat_id" "${tmp_dir}/${filename}" "Backup ${BACKUP_LABEL} - ${filename}" || true
  done
  rm -f "${tmp_dir:?}/${filename}"
done
rm -rf "${tmp_dir}"

current_step="complete"
notify_all "Backup delivered: ${BACKUP_LABEL}"

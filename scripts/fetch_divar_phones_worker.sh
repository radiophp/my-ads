#!/usr/bin/env bash
# Worker: lease a post from backend, fetch phone from Divar, and report back.
# Uses env defaults from scripts/fetch_divar_phones_worker.env if present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/fetch_divar_phones_worker.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BASE_URL="${BASE_URL:-https://mahan.toncloud.observer/api}"
TOKEN="${TOKEN:-}"
HEADERS_FILE="${HEADERS_FILE:-jwt.txt}"
SLEEP="${SLEEP:-10}"
WORKER_ID="${WORKER_ID:-worker-$$}"

if [[ ! -f "$HEADERS_FILE" ]]; then
  echo "Headers file not found: $HEADERS_FILE" >&2
  exit 1
fi

declare -a CURL_HEADERS=()
TMP_POST_FILE="$(mktemp)"
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  if [[ "$line" =~ ^[A-Za-z0-9_-]+: ]]; then
    CURL_HEADERS+=(-H "$line")
  fi
done < "$HEADERS_FILE"

AUTH_HEADER=()
[[ -n "$TOKEN" ]] && AUTH_HEADER=(-H "Authorization: Bearer $TOKEN")

normalize_phone() {
  perl -CS -Mutf8 -pe 'tr/۰۱۲۳۴۵۶۷۸۹/0123456789/' <<<"$1" | tr -d '[:space:]'
}

while true; do
  lease_resp="$(curl -sS -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" "${AUTH_HEADER[@]}" \
    -d "{\"workerId\":\"$WORKER_ID\"}" \
    "$BASE_URL/phone-fetch/lease")"

  lease_body="${lease_resp%$'\n'*}"
  lease_code="${lease_resp##*$'\n'}"

  if [[ "$lease_code" -lt 200 || "$lease_code" -ge 300 ]]; then
    echo "Lease failed (HTTP $lease_code): $lease_body" >&2
    sleep "$SLEEP"; continue
  fi

  if [[ "$(echo "$lease_body" | jq -r '.status // empty')" == "empty" ]]; then
    sleep "$SLEEP"; continue
  fi

  leaseId=$(echo "$lease_body" | jq -r '.leaseId')
  externalId=$(echo "$lease_body" | jq -r '.externalId')
  contactUuid=$(echo "$lease_body" | jq -r '.contactUuid')
  businessRef=$(echo "$lease_body" | jq -r '.businessRef // ""')
  businessType=$(echo "$lease_body" | jq -r '.businessType // ""')
  businessCacheState=$(echo "$lease_body" | jq -r '.businessCacheState // ""')
  postTitle=$(echo "$lease_body" | jq -r '.postTitle // ""')

  if [[ -z "$leaseId" || -z "$externalId" || -z "$contactUuid" ]]; then
    echo "Lease response missing fields: $lease_body" >&2
    sleep "$SLEEP"; continue
  fi

  if [[ -n "$businessRef" ]]; then
    cache_label="$businessCacheState"
    [[ -z "$cache_label" ]] && cache_label="new"
    human_cache_label="$([[ "$cache_label" == "update" ]] && echo "updated business" || echo "new business")"
    echo "[$WORKER_ID] Fetching phone for $externalId (lease $leaseId) -> https://divar.ir/v/$externalId [business=$businessRef type=$businessType $human_cache_label] \"${postTitle}\""
  else
    echo "[$WORKER_ID] Fetching phone for $externalId (lease $leaseId) -> https://divar.ir/v/$externalId [personal] \"${postTitle}\""
  fi

  # Pre-flight: fetch the post to mimic Divar’s flow (helps avoid rate limits)
  echo "[$WORKER_ID] Preflight GET https://api.divar.ir/v8/posts/$externalId"
  curl -sS -X GET "${CURL_HEADERS[@]}" --compressed \
    "https://api.divar.ir/v8/posts/$externalId" >/dev/null || true
  sleep 2

  response_file="$(mktemp)"
  http_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
    -X POST "${CURL_HEADERS[@]}" --compressed \
    --data-raw "{\"contact_uuid\":\"$contactUuid\"}" \
    "https://api.divar.ir/v8/postcontact/web/contact_info_v2/$externalId" || true)"

  phone_raw="$(jq -r '(.widget_list[]?.data?.action?.payload?.phone_number // empty) | select(length>0)' < "$response_file" 2>/dev/null | head -n1)"
  rm -f "$response_file"

  status="ok"
  err_msg=""
  phone_norm=""

  if [[ "$http_code" != "200" || -z "$phone_raw" ]]; then
    status="error"
    err_msg="http=$http_code"
    echo "[$WORKER_ID] Failed for $externalId ($err_msg)" >&2
  else
    phone_norm="$(normalize_phone "$phone_raw")"
    echo "[$WORKER_ID] Saved $externalId -> $phone_norm" >&2
  fi

  report_payload="{\"leaseId\":\"$leaseId\",\"status\":\"$status\""
  if [[ "$status" == "ok" ]]; then
    report_payload+=",\"phoneNumber\":\"$phone_norm\"}"
  else
    report_payload+=",\"error\":\"$err_msg\"}"
  fi

  curl -sS -X POST -H "Content-Type: application/json" "${AUTH_HEADER[@]}" \
    -d "$report_payload" \
    "$BASE_URL/phone-fetch/report" >/dev/null || true

  sleep "$SLEEP"
done

#!/usr/bin/env bash
#
# Fetch Divar phone numbers from a CSV list of post tokens and contact UUIDs.
# Inputs (can be overridden via env vars):
#   HEADERS_FILE - path to file containing full HTTP request headers (default ./jwt.txt)
#                  paste the whole request headers block (one header per line, colon-separated).
#   INPUT        - path to CSV with "external_id,contact_uuid" rows (defaults to ./post.csv)
#   OUTPUT       - path to write "external_id,phone_number" rows (defaults to ./post_number.csv)
#   SLEEP        - seconds to sleep between requests to respect rate limits (defaults to 10)
#
# Example usage:
#   ./scripts/fetch_divar_phones.sh
#   HEADERS_FILE=myheaders.txt INPUT=posts.csv OUTPUT=phones.csv SLEEP=12 ./scripts/fetch_divar_phones.sh

set -euo pipefail

HEADERS_FILE="${HEADERS_FILE:-jwt.txt}"
INPUT="${INPUT:-post.csv}"
OUTPUT="${OUTPUT:-post_number.csv}"
SLEEP="${SLEEP:-10}"

if [[ ! -f "$HEADERS_FILE" ]]; then
  echo "Headers file not found: $HEADERS_FILE" >&2
  exit 1
fi

if [[ ! -f "$INPUT" ]]; then
  echo "Input CSV not found: $INPUT" >&2
  exit 1
fi

echo "external_id,phone_number" > "$OUTPUT"

declare -a CURL_HEADERS=()
while IFS= read -r line; do
  # skip empty or request-line
  [[ -z "$line" ]] && continue
  if [[ "$line" =~ ^[A-Za-z0-9_-]+: ]]; then
    CURL_HEADERS+=(-H "$line")
  fi
done < "$HEADERS_FILE"

if [[ ${#CURL_HEADERS[@]} -eq 0 ]]; then
  echo "No headers parsed from $HEADERS_FILE" >&2
  exit 1
fi

normalize_phone() {
  perl -CS -Mutf8 -pe 'tr/۰۱۲۳۴۵۶۷۸۹/0123456789/' <<<"$1" | tr -d '[:space:]'
}

while IFS=, read -r external_id contact_uuid _rest; do
  external_id="$(echo -n "$external_id" | tr -d '[:space:]')"
  contact_uuid="$(echo -n "$contact_uuid" | tr -d '[:space:]')"

  # Skip header or empty rows
  if [[ -z "$external_id" || "$external_id" == external_id* ]]; then
    continue
  fi
  if [[ -z "$contact_uuid" ]]; then
    echo "Skipping $external_id: missing contact_uuid" >&2
    continue
  fi

  echo "Fetching phone for $external_id ..." >&2

  response_file="$(mktemp)"
  http_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
    -X POST \
    "${CURL_HEADERS[@]}" \
    --compressed \
    --data-raw "{\"contact_uuid\":\"$contact_uuid\"}" \
    "https://api.divar.ir/v8/postcontact/web/contact_info_v2/$external_id" || true)"

  if [[ "$http_code" != "200" ]]; then
    echo "Request failed for $external_id (HTTP $http_code)" >&2
    rm -f "$response_file"
    sleep "$SLEEP"
    continue
  fi

  phone_raw="$(jq -r '(.widget_list[]?.data?.action?.payload?.phone_number // empty) | select(length>0)' < "$response_file" 2>/dev/null | head -n1)"
  if [[ -z "$phone_raw" ]]; then
    # Try a fallback jq parse to understand the body on failure
    fallback_preview="$(head -c 200 "$response_file" | tr '\n' ' ')"
    echo "No phone found or parse error for $external_id (body preview: $fallback_preview)" >&2
    rm -f "$response_file"
    sleep "$SLEEP"
    continue
  fi
  rm -f "$response_file"

  phone_normalized="$(normalize_phone "$phone_raw")"
  echo "$external_id,$phone_normalized" >> "$OUTPUT"
  echo "Saved $external_id -> $phone_normalized" >&2

  sleep "$SLEEP"
done < "$INPUT"

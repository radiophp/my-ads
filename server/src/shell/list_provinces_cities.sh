#!/bin/bash

# This script generates a PostgreSQL schema and insert statements for Divar's
# provinces, cities, and districts from the places-web.json data.  It writes
# the SQL to the file specified by SQL_FILE.  By default it downloads the
# JSON from https://map.divarcdn.com/places-web.json, but because direct
# downloads may be blocked in some environments, you can provide a local copy
# via the JSON_FILE variable.

SQL_FILE="divar_locations_with_districts.sql"

# URL of the Divar places JSON
JSON_URL="https://map.divarcdn.com/places-web.json"

# Temporary file for JSON.  If you have downloaded places-web.json manually,
# set JSON_FILE below and comment out the curl invocation.
JSON_FILE="$(mktemp)"

# Download the JSON.  Use headers to mimic a browser.  Comment out this
# section and set JSON_FILE to a local file if direct downloading is blocked.
curl -sSL \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36' \
  -H 'Origin: https://divar.ir' \
  "$JSON_URL" \
  -o "$JSON_FILE"

# Ensure jq is installed
if ! command -v jq >/dev/null; then
  echo "Error: jq is required. Please install jq." >&2
  exit 1
fi

# Begin SQL output file
cat > "$SQL_FILE" <<'SQL'
-- PostgreSQL schema for Divar provinces, cities, and districts
CREATE TABLE IF NOT EXISTS provinces (
  id BIGINT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cities (
  id BIGINT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  province_id BIGINT REFERENCES provinces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS districts (
  id BIGINT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  city_id BIGINT REFERENCES cities(id) ON DELETE CASCADE
);

-- Insert statements for provinces
SQL

# Insert provinces
jq -c '.[] | select(.type == "1" and .parent == 715)' "$JSON_FILE" | while read -r province; do
  prov_id=$(echo "$province" | jq -r '.id')
  prov_slug=$(echo "$province" | jq -r '.slug' | sed "s/'/''/g")
  prov_name=$(echo "$province" | jq -r '.name' | sed "s/'/''/g")
  echo "INSERT INTO provinces (id, slug, name) VALUES ($prov_id, '$prov_slug', '$prov_name');" >> "$SQL_FILE"
done

echo -e "\n-- Insert statements for cities" >> "$SQL_FILE"

# Insert cities
jq -c '.[] | select(.type == "2")' "$JSON_FILE" | while read -r city; do
  city_id=$(echo "$city" | jq -r '.id')
  city_slug=$(echo "$city" | jq -r '.slug' | sed "s/'/''/g")
  city_name=$(echo "$city" | jq -r '.name' | sed "s/'/''/g")
  province_id=$(echo "$city" | jq -r '.parent')
  echo "INSERT INTO cities (id, slug, name, province_id) VALUES ($city_id, '$city_slug', '$city_name', $province_id);" >> "$SQL_FILE"
done

echo -e "\n-- Insert statements for districts" >> "$SQL_FILE"

# Insert districts
jq -c '.[] | select(.type == "4")' "$JSON_FILE" | while read -r district; do
  dist_id=$(echo "$district" | jq -r '.id')
  dist_slug=$(echo "$district" | jq -r '.slug' | sed "s/'/''/g")
  dist_name=$(echo "$district" | jq -r '.name' | sed "s/'/''/g")
  city_id=$(echo "$district" | jq -r '.parent')
  echo "INSERT INTO districts (id, slug, name, city_id) VALUES ($dist_id, '$dist_slug', '$dist_name', $city_id);" >> "$SQL_FILE"
done

# Clean up
rm -f "$JSON_FILE"

echo "SQL script with districts generated: $SQL_FILE"


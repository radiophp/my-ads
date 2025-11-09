#!/bin/bash

# Usage: ./fetch_post.sh <post_token>
# Example: ./fetch_post.sh Aain3q1R

# The post token is the unique identifier at the end of a Divar ad URL.
TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "Error: no post token supplied."
  echo "Usage: $0 <post_token>"
  exit 1
fi

# Directory where JSON files will be stored
OUTPUT_DIR="./posts"
mkdir -p "$OUTPUT_DIR"

# Optional: include session cookies if the API requires them
COOKIE=""

# Endpoint URL for the post
URL="https://api.divar.ir/v8/posts-v2/web/${TOKEN}"

echo "Fetching post data for token: $TOKEN"

# Send the GET request and save the JSON response
curl -s "$URL" \
  -H 'User-Agent: Mozilla/5.0' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Referer: https://divar.ir/' \
  -H 'Origin: https://divar.ir' \
  ${COOKIE:+-H "Cookie: $COOKIE"} \
  -o "${OUTPUT_DIR}/${TOKEN}.json"

echo "Post data saved to ${OUTPUT_DIR}/${TOKEN}.json"

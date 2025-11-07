#!/bin/bash

# This script retrieves all category slugs from Divar's open-platform
# assets API, then fetches the search filters for each category in
# a specified city and writes each response into its own JSON file.
# Requires 'jq' and a network connection to api.divar.ir.

# City ID for which to request filters (2 = Karaj, 1 = Tehran, etc.)
CITY_ID="2"

# Optional: Session cookies copied from your browser.  Leave empty if not needed.
COOKIE=""

# Directory to store category filter JSON files
OUTPUT_DIR="./category_filters"
mkdir -p "$OUTPUT_DIR"

# Fetch the category list via GET and save to a file
echo "Downloading category list..."
curl -s 'https://api.divar.ir/v1/open-platform/assets/category' -o categories.json

# Extract all category slugs from the JSON
SLUGS=$(jq -r '.categories[].slug' categories.json)

# Loop over each category slug and fetch its filters
for SLUG in $SLUGS; do
  echo "Fetching filters for category: $SLUG"
  # Construct the request body for the filters endpoint
  BODY=$(jq -n \
    --arg city "$CITY_ID" \
    --arg cat "$SLUG" \
    '
    {
      city_ids: [$city],
      data: {
        form_data: {
          data: {
            category: {
              str: { value: $cat }
            }
          }
        },
        server_payload: {
          "@type": "type.googleapis.com/widgets.SearchData.ServerPayload",
          additional_form_data: {
            data: {
              sort: {
                str: { value: "sort_date" }
              }
            }
          }
        }
      },
      source_view: "CATEGORY_BREAD_CRUMB"
    }')

  # Call the private filters endpoint to get filter definitions.
  curl -s 'https://api.divar.ir/v8/postlist/w/filters' \
    --compressed \
    -X POST \
    -H 'User-Agent: Mozilla/5.0' \
    -H 'Content-Type: application/json' \
    -H 'Referer: https://divar.ir/' \
    -H 'Origin: https://divar.ir' \
    ${COOKIE:+-H "Cookie: $COOKIE"} \
    --data-raw "$BODY" \
    > "${OUTPUT_DIR}/filters_${SLUG}.json"
done

echo "All filter files saved to ${OUTPUT_DIR}/"

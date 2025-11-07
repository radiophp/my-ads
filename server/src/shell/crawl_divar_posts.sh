#!/bin/bash

# This script iterates through Divar's private postlist API and fetches pages
# until no more posts are returned. It constructs the JSON body with jq
# (jq must be installed) and updates pagination fields between requests.
# It saves each JSON response into a ./list_json directory.  You can provide
# your own session cookies if needed (set COOKIE below).

# Set your city ID and category slug
CITY_ID="2"              # Karaj
CATEGORY="residential-rent"

# Optional: your session cookies copied from the browser
COOKIE=""    # e.g. 'did=...; cdid=...; city=karaj; ...'

# Directory to store JSON results
OUTPUT_DIR="./list_json"
mkdir -p "$OUTPUT_DIR"

# Initial pagination parameters
PAGE=1
LAST_POST_DATE=""
CUMULATIVE_WIDGETS_COUNT=50

while true; do
  # Build the pagination_data object with @type. If LAST_POST_DATE is empty,
  # omit it; otherwise include it.
  PAGINATION=$(jq -n \
    --arg type "type.googleapis.com/post_list.PaginationData" \
    --arg last_post_date "$LAST_POST_DATE" \
    --argjson page "$PAGE" \
    --argjson layer "$PAGE" \
    --argjson cwc "$CUMULATIVE_WIDGETS_COUNT" \
    '
    ($last_post_date == "" or $last_post_date == null)
    | if . then
        { "@type": $type, page: $page, layer_page: $layer, cumulative_widgets_count: $cwc }
      else
        { "@type": $type, last_post_date: $last_post_date, page: $page, layer_page: $layer, cumulative_widgets_count: $cwc }
      end
    ')

  # Build the full request body
  BODY=$(jq -n \
    --arg city "$CITY_ID" \
    --arg cat "$CATEGORY" \
    --argjson pagination "$PAGINATION" \
    '
    {
      city_ids: [$city],
      pagination_data: $pagination,
      disable_recommendation: true,
      map_state: { camera_info: { bbox: {} } },
      search_data: {
        form_data: { data: { category: { str: { value: $cat } } } },
        server_payload: {
          "@type": "type.googleapis.com/widgets.SearchData.ServerPayload",
          additional_form_data: { data: { sort: { str: { value: "sort_date" } } } }
        }
      }
    }')

  # Send the request. Include Cookie header only if COOKIE is set.
  echo "Requesting page $PAGE..."
  RESPONSE=$(curl -s 'https://api.divar.ir/v8/postlist/w/search' \
    --compressed \
    -X POST \
    -H 'User-Agent: Mozilla/5.0' \
    -H 'Content-Type: application/json' \
    -H 'Referer: https://divar.ir/' \
    -H 'Origin: https://divar.ir' \
    ${COOKIE:+-H "Cookie: $COOKIE"} \
    --data-raw "$BODY")

  # Save the response to the list_json directory
  echo "$RESPONSE" > "${OUTPUT_DIR}/page_${PAGE}.json"

  # Count how many post rows were returned (list_widgets with widget_type == "POST_ROW")
  POST_COUNT=$(echo "$RESPONSE" | jq '[.list_widgets[] | select(.widget_type=="POST_ROW")] | length' 2>/dev/null || echo 0)
  if [ "$POST_COUNT" -eq 0 ]; then
    echo "No more posts.  Stopping."
    break
  fi

  # Extract last_post_date for the next request
  LAST_POST_DATE=$(echo "$RESPONSE" | jq -r '.pagination.data.last_post_date // empty' 2>/dev/null)
  if [ -z "$LAST_POST_DATE" ]; then
    echo "No last_post_date returned.  Stopping."
    break
  fi

  # Update cumulative_widgets_count if present; otherwise keep previous value
  NEW_CWC=$(echo "$RESPONSE" | jq -r '.pagination.data.cumulative_widgets_count // empty' 2>/dev/null)
  if [ -n "$NEW_CWC" ]; then
    CUMULATIVE_WIDGETS_COUNT="$NEW_CWC"
  fi

  # Increment the page counter
  PAGE=$((PAGE + 1))
done

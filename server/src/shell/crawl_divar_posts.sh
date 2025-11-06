#!/bin/bash

# This script demonstrates how you might iterate through Divar's private
# postlist API and fetch pages until no more posts are returned.  It
# constructs the JSON body with jq (you must have jq installed) and
# updates the pagination fields between requests.  Because the API is
# private, you need to provide your own session cookies to avoid 403
# errors; set COOKIE below accordingly.  Run this script on your own
# machine where POST requests to api.divar.ir are allowed.

# Set your city ID and category slug
CITY_ID="2"              # Karaj
CATEGORY="residential-rent"

# Optional: your session cookies copied from the browser
COOKIE=""    # e.g. 'did=...; cdid=...; city=karaj; ...'

# Initial pagination parameters
PAGE=1
LAST_POST_DATE=""
CUMULATIVE_WIDGETS_COUNT=50

while true; do
  # Build the pagination_data object.  If LAST_POST_DATE is empty,
  # omit it from the object; otherwise include it.
  if [ -z "$LAST_POST_DATE" ]; then
    PAGINATION=$(jq -n --argjson page "$PAGE" --argjson layer "$PAGE" --argjson cwc "$CUMULATIVE_WIDGETS_COUNT" '{page: $page, layer_page: $layer, cumulative_widgets_count: $cwc}')
  else
    PAGINATION=$(jq -n --arg last_post_date "$LAST_POST_DATE" --argjson page "$PAGE" --argjson layer "$PAGE" --argjson cwc "$CUMULATIVE_WIDGETS_COUNT" '{last_post_date: $last_post_date, page: $page, layer_page: $layer, cumulative_widgets_count: $cwc}')
  fi

  # Build the full request body
  BODY=$(jq -n --arg city "$CITY_ID" --arg cat "$CATEGORY" --argjson pagination "$PAGINATION" '
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

  # Send the request.  Note: remove --compressed if your curl version
  # does not support it.  Include the Cookie header only if you have set COOKIE.
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

  # Save the response to a file for later inspection
  echo "$RESPONSE" > "page_${PAGE}.json"

  # Check whether posts were returned.  Adjust the jq path according
  # to the actual response structure; here we assume a top-level array
  # field named "posts" exists.  If no posts, break.
  POST_COUNT=$(echo "$RESPONSE" | jq '.posts | length' 2>/dev/null || echo 0)
  if [ "$POST_COUNT" -eq 0 ]; then
    echo "No more posts.  Stopping."
    break
  fi

  # Extract the last_post_date for the next request.  Adjust the jq
  # path based on the actual response structure; here we assume
  # response.pagination_data.last_post_date exists.
  LAST_POST_DATE=$(echo "$RESPONSE" | jq -r '.pagination_data.last_post_date' 2>/dev/null)
  if [ -z "$LAST_POST_DATE" ] || [ "$LAST_POST_DATE" = "null" ]; then
    echo "No last_post_date returned.  Stopping."
    break
  fi

  # Increment the page counter
  PAGE=$((PAGE + 1))
done

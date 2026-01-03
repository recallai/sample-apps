#!/usr/bin/env bash
set -euo pipefail

DOTENV_FILE="${DOTENV_FILE:-.env}"
if [ -f "$DOTENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$DOTENV_FILE"
fi

: "${RECALL_REGION:?RECALL_REGION is required (us-west-2, us-east-1, eu-central-1, ap-northeast-1)}"
: "${RECALL_API_KEY:?RECALL_API_KEY is required}"
: "${MEETING_URL:?MEETING_URL is required (Zoom/Meet URL)}"
: "${NGROK_DOMAIN:?NGROK_DOMAIN is required (ngrok.io host without scheme)}"

# Extract meeting ID from Zoom URL (matches zoom.us/j/123, zoom.com/s/123, etc.)
MEETING_ID=$(echo "${MEETING_URL}" | grep -oE 'zoom\.(us|com)/(j|s|wc/join)/([0-9]+)' | grep -oE '[0-9]+$')
if [ -z "${MEETING_ID}" ]; then
  echo "Error: Could not extract meeting ID from URL: ${MEETING_URL}" >&2
  exit 1
fi

curl --request POST \
  --url https://${RECALL_REGION}.recall.ai/api/v1/bot/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "accept: application/json" \
  --header "content-type: application/json" \
  --data @- <<EOF
{
  "meeting_url": "${MEETING_URL}",
  "zoom": {
    "obf_token_url": "https://${NGROK_DOMAIN}/zoom/obf?meeting_id=${MEETING_ID}"
  }
}
EOF

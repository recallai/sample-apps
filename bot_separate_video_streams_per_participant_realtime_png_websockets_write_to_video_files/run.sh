#!/usr/bin/env bash
set -euo pipefail

DOTENV_FILE="${DOTENV_FILE:-.env}"
if [ -f "$DOTENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$DOTENV_FILE"
fi

: "${RECALL_REGION:?REGION is required (us-west-2, us-east-1, eu-central-1, ap-northeast-1)}"
: "${RECALL_API_KEY:?RECALL_API_KEY is required}"
: "${MEETING_URL:?MEETING_URL is required (Zoom/Meet URL)}"
: "${NGROK_DOMAIN:?NGROK_DOMAIN is required (ngrok.io host without scheme)}"

curl --request POST \
  --url https://${RECALL_REGION}.recall.ai/api/v1/bot/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "accept: application/json" \
  --header "content-type: application/json" \
  --data @- <<EOF
{
  "meeting_url": "${MEETING_URL}",
  "recording_config": {
    "realtime_endpoints": [
      {
        "type": "websocket",
        "url": "wss://${NGROK_DOMAIN}",
        "events": [
          "video_separate_png.data"
        ]
      }
    ],
    "video_separate_png": {},
    "video_mixed_layout": "gallery_view_v2"
  }
}
EOF

#!/usr/bin/env bash
set -euo pipefail

DOTENV_FILE="${DOTENV_FILE:-.env}"
if [ -f "$DOTENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$DOTENV_FILE"
fi

: "${RECALL_REGION:?RECALL_REGION is required (us-west-2, us-east-1, eu-central-1, ap-northeast-1)}"
: "${RECALL_API_KEY:?RECALL_API_KEY is required}"
: "${MEETING_URL:?MEETING_URL is required (Zoom/Meet/Teams URL)}"
: "${NGROK_DOMAIN:?NGROK_DOMAIN is required (e.g. your-domain.ngrok-free.app)}"

curl --request POST \
  --url https://${RECALL_REGION}.recall.ai/api/v1/bot/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "accept: application/json" \
  --header "content-type: application/json" \
  --data @- <<EOF
{
  "meeting_url": "${MEETING_URL}",
  "output_media": {
    "camera": {
      "kind": "webpage",
      "config": {
        "url": "https://${NGROK_DOMAIN}"
      }
    }
  },
  "recording_config": {
    "include_bot_in_recording": {
      "audio": true
    }
  },
  "variant": {
    "zoom": "web_4_core",
    "google_meet": "web_4_core",
    "microsoft_teams": "web_4_core",
    "webex": "web_4_core"
  }
}
EOF


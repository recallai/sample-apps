#!/usr/bin/env bash
set -euo pipefail

# Start streaming via the local server API.
# Usage: ./run.sh <meeting_url>
# Example: ./run.sh "https://zoom.us/j/123456789"

MEETING_URL="${1:?Usage: ./run.sh <meeting_url>}"
PORT="${PORT:-4000}"

curl --request POST \
  --url "http://localhost:${PORT}/api/start" \
  --header "content-type: application/json" \
  --data @- <<EOF
{
  "meeting_url": "${MEETING_URL}"
}
EOF

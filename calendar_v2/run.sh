#!/usr/bin/env bash
set -euo pipefail

# Load environment variables from .env file
DOTENV_FILE="${DOTENV_FILE:-.env}"
if [ -f "$DOTENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$DOTENV_FILE"
fi

BASE_URL="http://localhost:${PORT:-4000}"

usage() {
    echo "Usage: ./run.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list <platform_email>         List calendars for a user"
    echo "  events <calendar_id>          List events for a calendar"
    echo "  delete <calendar_id>          Delete a calendar by ID"
    echo ""
    echo "Examples:"
    echo "  ./run.sh list user@example.com"
    echo "  ./run.sh events cal_abc123"
    echo "  ./run.sh delete cal_abc123"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

COMMAND="$1"
shift

case "$COMMAND" in
    list)
        if [ $# -lt 1 ]; then
            echo "Error: platform_email is required"
            echo "Usage: ./run.sh list <platform_email>"
            exit 1
        fi
        PLATFORM_EMAIL="$1"
        
        echo "Listing calendars for: $PLATFORM_EMAIL"
        curl -s "${BASE_URL}/api/calendar?platform_email=${PLATFORM_EMAIL}" | jq .
        ;;
    
    events)
        if [ $# -lt 1 ]; then
            echo "Error: calendar_id is required"
            echo "Usage: ./run.sh events <calendar_id>"
            exit 1
        fi
        CALENDAR_ID="$1"
        
        echo "Listing events for calendar: $CALENDAR_ID"
        curl -s "${BASE_URL}/api/calendar/events?calendar_id=${CALENDAR_ID}" | jq .
        ;;
    
    delete)
        if [ $# -lt 1 ]; then
            echo "Error: calendar_id is required"
            echo "Usage: ./run.sh delete <calendar_id>"
            exit 1
        fi
        CALENDAR_ID="$1"
        
        echo "Deleting calendar: $CALENDAR_ID"
        curl -s -X DELETE "${BASE_URL}/api/calendar?calendar_id=${CALENDAR_ID}" | jq .
        ;;
    
    *)
        echo "Error: Unknown command '$COMMAND'"
        usage
        ;;
esac

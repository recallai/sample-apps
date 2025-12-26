# Calendar V2 Demo

A full-stack demo app showing how to integrate [Recall.ai's Calendar API](https://docs.recall.ai/docs/calendar-integration-overview) to automatically schedule meeting bots for calendar events.

## Features

- **OAuth Integration**: Connect Google Calendar or Microsoft Outlook accounts
- **Calendar Sync**: Automatically sync calendar events via Recall.ai webhooks
- **Bot Scheduling**: Schedule/unschedule recording bots for meetings with video links

## Architecture & Request Flows

### 1. Connecting a Calendar (OAuth Flow)

When a user clicks "Connect Google" or "Connect Outlook":

```
  Client              Server          Calendar Provider        Recall.ai
    │                   │             (Google/Outlook)              │
    │                   │                      │                    │
    │ GET /oauth?platform=google_calendar|microsoft_outlook         │
    │──────────────────▶│                      │                    │
    │                   │                      │                    │
    │   302 Redirect to provider OAuth         │                    │
    │◀──────────────────│                      │                    │
    │                   │                      │                    │
    │   User authorizes calendar access        │                    │
    │─────────────────────────────────────────▶│                    │
    │                   │                      │                    │
    │   Redirect back with auth code           │                    │
    │◀─────────────────────────────────────────│                    │
    │                   │                      │                    │
    │ GET /oauth/callback?code=abc123          │                    │
    │──────────────────▶│                      │                    │
    │                   │                      │                    │
    │                   │  Exchange code for   │                    │
    │                   │  OAuth tokens        │                    │
    │                   │─────────────────────▶│                    │
    │                   │                      │                    │
    │                   │  { access_token,     │                    │
    │                   │    refresh_token }   │                    │
    │                   │◀─────────────────────│                    │
    │                   │                      │                    │
    │                   │   POST /api/v2/calendars                  │
    │                   │   { refresh_token, client_id, ... }       │
    │                   │─────────────────────────────────────────-▶│
    │                   │                      │                    │
    │                   │                      │   Calendar created │
    │                   │◀─────────────────────────────────────────-│
    │                   │                      │                    │
    │   302 Redirect to dashboard              │                    │
    │◀──────────────────│                      │                    │
```

### 2. Calendar Sync & Auto-Scheduling (Webhook)

After OAuth (and on ongoing calendar changes), calendar providers notify Recall.ai via webhooks, which then notifies your server:

```
  Google/Outlook          Recall.ai                 Server
       │                      │                       │
       │  Calendar event      │                       │
       │  created/updated     │                       │
       │  (webhook push)      │                       │
       │─────────────────────▶│                       │
       │                      │                       │
       │                      │         POST /api/recall/webhook
       │                      │         { event: "calendar.sync_events",
       │                      │           calendar_id, last_updated_ts }
       │                      │──────────────────────▶│
       │                      │                       │
       │                      │      GET /api/v2/calendar-events
       │                      │          ?calendar_id=...&updated_at__gte={last_updated_ts}
       │                      │◀──────────────────────│
       │                      │                       │
       │                      │ [only changed events] │
       │                      │──────────────────────▶│
       │                      │                       │
       │                      │       For each event with meeting_url
       │                      │       and start_time in future:
       │                      │                       │
       │                      │  POST /api/v2/calendar-events/{id}/bot
       │                      │◀──────────────────────│
       │                      │                       │
       │                      │   { bot scheduled }   │
       │                      │──────────────────────▶│
       │                      │                       │
       │                      │         200 OK        │
       │                      │  (respond to webhook) │
       │                      │◀──────────────────────│
```

### 3. Manual Recording Toggle (User Action)

When a user toggles the recording switch in the UI:

```
  Client                Server              Recall.ai
    │                     │                    │
    │  Toggle "Record" ON │                    │
    │                     │                    │
    │  POST /api/calendar/events/bot?calendar_event_id=...
    │────────────────────▶│                    │
    │                     │                    │
    │                     │  POST /api/v2/calendar-events/{id}/bot
    │                     │───────────────────▶│
    │                     │                    │
    │                     │   Bot scheduled    │
    │                     │◀───────────────────│
    │                     │                    │
    │       200 OK        │                    │
    │◀────────────────────│                    │
    │                     │                    │
    │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
    │                     │                    │
    │  Toggle "Record" OFF│                    │
    │                     │                    │
    │  DELETE /api/calendar/events/bot?calendar_event_id=...
    │────────────────────▶│                    │
    │                     │                    │
    │                     │  DELETE /api/v2/calendar-events/{id}/bot
    │                     │───────────────────▶│
    │                     │                    │
    │                     │   Bot unscheduled  │
    │                     │◀───────────────────│
    │                     │                    │
    │       200 OK        │                    │
    │◀────────────────────│                    │
```

### Key Points

- **Push-based sync**: Calendar providers send webhooks to Recall, which notifies your server—use via the `calendar.update` or `calendar.sync_events` webhooks. Note: use the `last_updated_ts` to fetch only changed events on `calendar.sync_events` webhooks.
- **Deduplication keys**: Prevent duplicate bots when multiple users have the same meeting
- **Recall auto-manages bots**: Automatically unschedules bots when events are deleted or calendars are disconnected, and reschedules when meeting times change

## Prerequisites

- Node.js 18+
- [ngrok](https://ngrok.com/) account (for webhooks)
- Recall.ai API key
- Google and/or Microsoft OAuth credentials

## Setup

### 1. Set up OAuth providers

Follow the official Recall.ai guides to create OAuth credentials (you'll need these for step 3):

- **Google Calendar**: [Google Calendar Setup Guide](https://docs.recall.ai/docs/calendar-v2-google-calendar)
- **Microsoft Outlook**: [Microsoft Outlook Setup Guide](https://docs.recall.ai/docs/calendar-v2-microsoft-outlook)

Use `https://your-domain.ngrok-free.app/api/calendar/oauth/callback` as the redirect URI.

### 2. Install dependencies

```bash
cd calendar_v2
npm install
```

### 3. Configure environment variables

Copy the sample environment file and fill in your values:

```bash
cp .env.sample .env
```

Then edit `.env` with your Recall API key, ngrok domain, and OAuth credentials from step 1.

### 4. Configure Recall.ai webhook

In your [Recall.ai webhooks dashboard](https://docs.recall.ai/reference/webhooks-overview), set the webhook URL to:

```
https://your-domain.ngrok-free.app/api/recall/webhook
```

### 5. Start ngrok

```bash
ngrok http 4000 --domain=your-domain.ngrok-free.app
```

### 6. Run the app

```bash
npm run dev
```

This starts:

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Click "Connect Google" or "Connect Outlook" to authorize your calendar
3. After OAuth, you'll see your calendar events
4. Toggle the recording switch on any future meeting with a video link
5. A Recall.ai bot will join the meeting at the scheduled time

## API Endpoints

| Method | Endpoint                                                          | Description                |
| ------ | ----------------------------------------------------------------- | -------------------------- |
| GET    | `/api/calendar/oauth?platform=google_calendar\|microsoft_outlook` | Start OAuth flow           |
| GET    | `/api/calendar/oauth/callback`                                    | OAuth callback handler     |
| POST   | `/api/recall/webhook`                                             | Recall.ai webhook receiver |
| GET    | `/api/calendar?platform_email=...`                                | List connected calendars   |
| DELETE | `/api/calendar?calendar_id=...`                                   | Disconnect a calendar      |
| GET    | `/api/calendar/events?calendar_id=...`                            | List calendar events       |
| POST   | `/api/calendar/events/bot?calendar_event_id=...`                  | Schedule bot for event     |
| DELETE | `/api/calendar/events/bot?calendar_event_id=...`                  | Unschedule bot for event   |

## Project Structure

```
calendar_v2/
├── src/
│   ├── api/                    # Backend server
│   │   ├── config/env.ts       # Environment validation
│   │   ├── handlers/           # API route handlers
│   │   │   ├── calendar_oauth.ts
│   │   │   ├── calendar_oauth_callback.ts
│   │   │   ├── calendar_events_list.ts
│   │   │   ├── calendars_list.ts
│   │   │   ├── calendars_delete.ts
│   │   │   └── recall_webhook.ts
│   │   └── index.ts            # HTTP server
│   ├── client/                 # React frontend
│   │   ├── App.tsx             # Main app component
│   │   ├── components/         # UI components
│   │   └── hooks/              # React Query hooks
│   └── schemas/                # Data validation models
└── package.json
```

## Bot Deduplication

The app uses meeting-level deduplication by default:

```typescript
deduplication_key = `${meeting_url}-${meeting_start_timestamp}`;
```

This ensures only one bot joins per meeting, even if multiple users have the same event.

Other strategies available:

- **User level**: One bot per user per meeting
- **Domain level**: One bot per company domain per meeting

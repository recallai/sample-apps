# Zoom OAuth-Based Flow (OBF) for Bots

This example demonstrates how to implement the Zoom OAuth-Based Flow (OBF) to allow Recall.ai bots to join Zoom meetings on behalf of another participant in the call.

## What is OBF?

The OAuth-Based Flow (OBF) ties a bot's lifetime in a meeting directly to a specific user in that meeting. The bot can only be in the meeting as long as its "parent" user is. This enables:

-   Joining meetings that require signed-in participants
-   Starting instant meetings or scheduled meetings before the host joins
-   Bypassing waiting rooms (when configured)
-   Appearing as a named user rather than a guest

> **📘 For complete documentation, see:** [Zoom Native Bots (OBF)](https://docs.recall.ai/docs/zoom-native-bots-obf)

## How It Works

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │     │  Server  │     │   Zoom   │     │ Recall   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. GET /zoom/oauth              │                │
     │───────────────▶│                │                │
     │                │                │                │
     │   Redirect to Zoom OAuth        │                │
     │◀───────────────│                │                │
     │                │                │                │
     │   Authorize app                 │                │
     │────────────────────────────────▶│                │
     │                │                │                │
     │   Callback with code            │                │
     │◀────────────────────────────────│                │
     │                │                │                │
     │ 2. GET /zoom/oauth/callback     │                │
     │───────────────▶│                │                │
     │                │  Exchange for tokens            │
     │                │───────────────▶│                │
     │                │  { refresh_token }              │
     │                │◀───────────────│                │
     │                │  (stored locally)               │
     │                │                │                │
     │ ═══════════════════════════════════════════════ │
     │         Later, when creating a bot:             │
     │ ═══════════════════════════════════════════════ │
     │                │                │                │
     │                │ 3. POST /api/v1/bot             │
     │                │ { zoom: { obf_token_url } }     │
     │                │───────────────────────────────▶│
     │                │                │                │
     │ ═══════════════════════════════════════════════ │
     │              When bot joins call:               │
     │ ═══════════════════════════════════════════════ │
     │                │                │                │
     │                │ 4. GET /zoom/obf                │
     │                │◀───────────────────────────────│
     │                │                │                │
     │                │  Refresh access token           │
     │                │───────────────▶│                │
     │                │                │                │
     │                │  Get OBF token │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │    obf_token   │                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │  Return OBF token               │
     │                │───────────────────────────────▶│
     │                │                │                │
     │                │         Bot joins meeting       │
     │                │                │                │
```

## Prerequisites

-   [Zoom General App](https://developers.zoom.us/docs/integrations/create/) with scope: `user:read:token` and **Meeting SDK** enabled
-   [ngrok](https://ngrok.com/) for exposing your local server
-   [Node.js](https://nodejs.org/) 18+
-   Custom SDK credentials enabled in your Recall workspace (contact Recall support)

## Setup

### 1. Start ngrok

```bash
ngrok http 4000
```

Copy the domain (e.g. `abc123.ngrok-free.app`).

### 2. Create a Zoom General App

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Create a **General App** with OAuth
3. Add the scope: `user:read:token`
4. In the **Embed** section, enable **Meeting SDK**
5. Set the OAuth Redirect URL to: `https://YOUR_NGROK_DOMAIN/zoom/oauth/callback`
6. Add your OBF callback URL to the allow list: `https://YOUR_NGROK_DOMAIN/zoom/obf`
7. Copy the **Client ID** and **Client Secret**

### 3. Add SDK credentials to Recall

1. Navigate to **Meeting Bot Setup** > **Zoom** in the Recall dashboard
2. Paste your Zoom app's Client ID and Client Secret

### 4. Configure environment

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file, including the ngrok domain from step 1 (Don't forget to omit the protocol (e.g. `https://`)).

### 5. Start the server

Open this directory in a new terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 6. Complete the OAuth flow

Open your browser and navigate to:

```
https://YOUR_NGROK_DOMAIN/zoom/oauth
```

Follow the prompts to authorize your Zoom app. After authorizing, the refresh token will be saved to `output/zoom_oauth_refresh_token.txt`.

### 7. Create a bot

You can create a bot using the `run.sh` script or manually with curl.

#### Option A: Using run.sh (recommended)

In a new terminal, run the script:

```bash
chmod +x run.sh
./run.sh
```

This will create a bot and paste the response in the terminal.

#### Option B: Using curl

```bash
curl -X POST "https://RECALL_REGION.recall.ai/api/v1/bot/" \
  -H "Authorization: YOUR_RECALL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_url": "YOUR_ZOOM_MEETING_URL",
    "zoom": {
      "obf_token_url": "https://YOUR_NGROK_DOMAIN/zoom/obf?meeting_id=ZOOM_MEETING_ID"
    }
  }'
```

**Note**:

-   Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own
    values.
-   Replace `YOUR_NGROK_DOMAIN` with your ngrok domain (e.g. `somehash.ngrok-free.app`).
-   The bot will join the meeting on behalf of the OAuth user.

## Important OBF Behavior

-   **Short-lived & single-use**: OBF tokens should be minted just-in-time when launching a bot
-   **Parent user required**: The bot can't join until the parent user has already joined the meeting
-   **Linked lifetime**: If the parent user leaves, the bot's SDK session will end

## API Endpoints

| Endpoint                   | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `GET /zoom/oauth`          | Initiates Zoom OAuth flow                              |
| `GET /zoom/oauth/callback` | Handles OAuth callback, stores refresh token           |
| `GET /zoom/obf`            | Returns an OBF token (called by Recall when bot joins) |

# Zoom Join Token Flow for Skipping Waiting Rooms

This sample app shows how to skip the Zoom waiting room by generating a Zoom join token for local recording just before the bot joins the meeting.

> ⚠️ **Before you start**
>
> - This flow uses the Zoom SDK, so you also need an OBF token callback in addition to the join token callback.
> - This flow requires a feature flag on your Recall workspace; contact Recall support to enable it.

## Important Join Token Behavior

- **Short-lived & single-use**: Join tokens should be minted just-in-time (in the `/zoom/join-token` endpoint) when launching a bot
- **Meeting-scoped**: A join token is valid for a specific meeting ID, so pass the correct `meeting_id` every time

## Prerequisites

- [Zoom General App](https://developers.zoom.us/docs/integrations/create/)
- [ngrok](https://ngrok.com/) for exposing your local server
- [Node.js](https://nodejs.org/) 18+
- Custom SDK credentials enabled in your Recall workspace (contact Recall support to enable)

## Setup

### 1. Start ngrok

```bash
ngrok http 4000
```

Copy the domain (e.g. `abc123.ngrok-free.app`).

### 2. Create a Zoom General App

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Create a **General App** with OAuth
3. Set the OAuth Redirect URL to: `https://YOUR_NGROK_DOMAIN/zoom/oauth/callback` (Note: this will also be used in your .env in step 4)
4. Add the scope: `meeting:read:local_recording_token` and `user:read:token`
5. In the **Embed** section, enable **Meeting SDK**
6. Copy the **Client ID** and **Client Secret**

### 3. Add SDK credentials to Recall

1. Navigate to **Meeting Bot Setup** > **Zoom** in the Recall dashboard
2. Paste your Zoom app's Client ID and Client Secret

### 4. Set up env variables

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file, including the ngrok domain from step 1.

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

Once you complete step 6, you can then create a bot using the `run.sh` script or manually with curl.

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
      "join_token_url": "https://YOUR_NGROK_DOMAIN/zoom/join-token?meeting_id=ZOOM_MEETING_ID",
      "obf_token_url": "https://YOUR_NGROK_DOMAIN/zoom/obf-token?meeting_id=ZOOM_MEETING_ID"
    }
  }'
```

**Note**:

- Replace `RECALL_REGION`, `RECALL_API_KEY`, `YOUR_MEETING_URL`, and `ZOOM_MEETING_ID` with your own
  values.
- Replace `YOUR_NGROK_DOMAIN` with your ngrok domain (e.g. `somehash.ngrok-free.app`).
- The bot will join the meeting on behalf of the OAuth user.

## How It Works

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │   Zoom   │     │  Recall  │
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
     │ ════════════════════════════════════════════════ │
     │         Later, when creating a bot:              │
     │ ════════════════════════════════════════════════ │
     │                │                │                │
     │                │ 3. POST /api/v1/bot             │
     │                │ { zoom: { join_token_url, obf_token_url } } │
     │                │────────────────────────────────▶│
     │                │                │                │
     │ ════════════════════════════════════════════════ │
     │               When bot joins call:               │
     │ ════════════════════════════════════════════════ │
     │                │                │                │
     │                │ 4. GET /zoom/join-token         │
     │                │◀────────────────────────────────│
     │                │                │                │
     │                │  Refresh access token           │
     │                │───────────────▶│                │
     │                │                │                │
     │                │  Get join token │               │
     │                │───────────────▶│                │
     │                │                │                │
     │                │   join_token   │                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ Return join token               │
     │                │────────────────────────────────▶│
     │                │                │                │
     │                │ 5. GET /zoom/obf-token          │
     │                │◀────────────────────────────────│
     │                │                │                │
     │                │  Refresh access token           │
     │                │───────────────▶│                │
     │                │                │                │
     │                │   Get OBF token │               │
     │                │───────────────▶│                │
     │                │                │                │
     │                │    obf_token   │                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ Return OBF token                │
     │                │────────────────────────────────▶│
     │                │                │                │
     │                │         Bot joins meeting       │
     │                │                │                │
```

## API Endpoints

| Endpoint                   | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `GET /zoom/oauth`          | Initiates Zoom OAuth flow                              |
| `GET /zoom/oauth/callback` | Handles OAuth callback, stores refresh token           |
| `GET /zoom/join-token`     | Returns a join token (called by Recall when bot joins) |
| `GET /zoom/obf-token`      | Returns an OBF token (required support callback)       |

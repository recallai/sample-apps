# Zoom Access Key (ZAK) Token Flow for Signed-In Zoom Bots

This example demonstrates how to implement the Zoom ZAK (Zoom Access Key) token flow to allow Recall.ai bots to join Zoom meetings as a signed-in user.

## What is ZAK?

The ZAK (Zoom Access Key) token enables bots to join Zoom meetings with authenticated access which enables:

- Joining meetings that require signed-in participants
- Starting instant meetings or scheduled meetings before the host joins
- Appearing as a named Zoom user rather than a guest

> **📘 For complete documentation, see:** [Zoom Signed-in Bots](https://docs.recall.ai/docs/zoom-signed-in-bots)

## How It Works

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │   Zoom   │     │  Recall  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └─────┬────┘
     │                │                │                 │
     │ 1. GET Zoom OAuth Authorization URL               │
     │───────────────▶│                │                 │
     │                │                │                 │
     │   Redirect to Zoom OAuth        │                 │
     │◀───────────────│                │                 │
     │                │                │                 │
     │   Authorize app                 │                 │
     │────────────────────────────────▶│                 │
     │                │                │                 │
     │   Callback with code            │                 │
     │◀────────────────────────────────│                 │
     │                │                │                 │
     │ 2. GET Zoom OAuth callback      │                 │
     │───────────────▶│                │                 │
     │                │  Exchange for tokens             │
     │                │───────────────▶│                 │
     │                │  { refresh_token }               │
     │                │◀───────────────│                 │
     │                │  (stored locally)                │
     │                │                │                 │
     │ ═════════════════════════════════════════════════ │
     │           Later, when creating a bot:             │
     │ ═════════════════════════════════════════════════ │
     │                │                │                 │
     │                │ 3. POST /api/v1/bot              │
     │                │ { zoom: { zak_url } }            │
     │                │─────────────────────────────────▶│
     │                │                │                 │
     │ ═════════════════════════════════════════════════ │
     │              When bot joins call:                 │
     │ ═════════════════════════════════════════════════ │
     │                │                │                 │
     │                │ 4. GET zak_url │                 │
     │                │◀─────────────────────────────────│
     │                │                │                 │
     │                │  Refresh access token            │
     │                │───────────────▶│                 │
     │                │                │                 │
     │                │  Get ZAK token │                 │
     │                │───────────────▶│                 │
     │                │                │                 │
     │                │   zak_token    │                 │
     │                │◀───────────────│                 │
     │                │                │                 │
     │                │  Return ZAK token                │
     │                │─────────────────────────────────▶│
     │                │                │                 │
     │                │         Bot joins meeting        │
     │                │                │                 │
```

## Prerequisites

- [Zoom OAuth App](https://developers.zoom.us/docs/integrations/create/) with scope: `user:read:zak`
- [ngrok](https://ngrok.com/) for exposing your local server
- [Node.js](https://nodejs.org/) 18+

## Setup

### 1. Start ngrok

```bash
ngrok http 4000
```

Copy the domain (e.g. `abc123.ngrok-free.app`).

### 2. Create a Zoom OAuth App

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Create a **General App** with OAuth
3. Set the OAuth Redirect URL to: `https://YOUR_NGROK_DOMAIN/zoom/oauth/callback`
4. Add the scope: `user:read:zak`
5. Copy the **Client ID** and **Client Secret**

### 3. Set up env variables

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file, including the ngrok domain from step 1 (Don't forget to omit the protocol (e.g. `https://`)).

### 4. Start the server

Open this directory in a new terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 5. Complete the OAuth flow

Open your browser and navigate to:

```
https://YOUR_NGROK_DOMAIN/zoom/oauth
```

Follow the prompts to authorize your Zoom app. After authorizing, the refresh token will be saved to `output/zoom_oauth_refresh_token.txt`.

### 6. Create a bot

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
      "zak_url": "https://YOUR_NGROK_DOMAIN/zoom/zak"
    }
  }'
```

**Note**:

- Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own
  values.
- Replace `YOUR_NGROK_DOMAIN` with your ngrok domain (e.g. `somehash.ngrok-free.app`).
- The bot will join the meeting as a signed-in Zoom user.

## API Endpoints

| Endpoint                   | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| `GET /zoom/oauth`          | Initiates Zoom OAuth flow                             |
| `GET /zoom/oauth/callback` | Handles OAuth callback, stores refresh token          |
| `GET /zoom/zak`            | Returns a ZAK token (called by Recall when bot joins) |

# Real-time mixed video stream to Mux via RTMP

This example demonstrates how to live stream audio and video from a meeting to a webpage via RTMP through Mux. The bot streams to Mux at 720p/30fps via RTMP, and the webpage displays the live stream using the Mux Player.

## How It Works

1. User enters a meeting URL in the web client
2. Server creates a Mux live stream and a Recall bot with RTMP streaming
3. Recall streams audio and video directly to Mux via RTMP
4. The web client displays the live stream through the Mux player

## Pre-requisites

- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Mux Account](https://www.mux.com/) with API credentials
- [Recall.ai Account](https://www.recall.ai/) with API key

## Quickstart

### 1. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Fill out the variables:

- `MUX_ACCESS_TOKEN_ID` - Your Mux API token ID
- `MUX_ACCESS_TOKEN_SECRET` - Your Mux API token secret
- `RECALL_REGION` - Your Recall region (us-west-2, us-east-1, eu-central-1, ap-northeast-1)
- `RECALL_API_KEY` - Your Recall API key

### 2. Start the server

```bash
npm install
npm run dev
```

### 3. Start streaming

1. Open http://localhost:4000
2. Enter a meeting URL (Zoom, Google Meet, or Microsoft Teams)
3. Click "Start Streaming"
4. Allow the bot into the meeting and wait for Mux to start streaming data (up to 30s)
4. Watch the live stream on the webpage

## Stream Specifications

- **Resolution:** 720p at 30 FPS
- **Latency:** Low-latency mode (~15 seconds)
- **Video Layout:** Matches the bot's recording format (speaker view or gallery view)

## References

- [Recall.ai RTMP Streaming Documentation](https://docs.recall.ai/docs/stream-real-time-video-rtmp)
- [Mux Live Streaming Guide](https://docs.mux.com/guides/start-live-streaming)
- [Mux Create Live Stream API](https://mux.com/docs/api-reference/video/live-streams/create-live-stream)

# Async transcription from a meeting bot

This example demonstrates how to receive async transcription for a meeting recording. The server listens for webhook events from Recall.ai:

1. When `recording.done` is received, it triggers async transcript creation via Recall's API
2. When `transcript.done` is received, it downloads and saves the transcript to local files

## Pre-requisites

- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

**Before running, make sure you don't have any apps running on port 4000**

### 1. Start ngrok

In a terminal window, run:

```bash
ngrok http 4000
```

After it's running, copy the ngrok URL (e.g. `somehash.ngrok-free.app`).

### 2. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file, including the ngrok domain from step 1 (Don't forget to omit the protocol (e.g. `https://`))

### 3. Add your webhook URL to the Recall dashboard

Go to the Recall.ai webhooks dashboard for your region and add your ngrok URL as a webhook:

- [`us-east-1` webhooks dashboard](https://us-east-1.recall.ai/dashboard/webhooks)
- [`us-west-2` webhooks dashboard](https://us-west-2.recall.ai/dashboard/webhooks)
- [`eu-central-1` webhooks dashboard](https://eu-central-1.recall.ai/dashboard/webhooks)
- [`ap-northeast-1` webhooks dashboard](https://ap-northeast-1.recall.ai/dashboard/webhooks)

Make sure to subscribe to the following events:

- `recording.done`
- `transcript.done`

### 4. Start the server

Open this directory in a new terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 5. Create a bot

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
curl --request POST \
  --url https://RECALL_REGION.recall.ai/api/v1/bot/ \
  --header 'Authorization: RECALL_API_KEY' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "meeting_url": "YOUR_MEETING_URL"
  }'
```

**Note:**

- Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own values.

### 6. View the output

After the call ends and the async transcript is processed, you can find the transcript files in the newly-generated `output/` folder, organized by recording ID:

- `transcript.json` - The transcript parts data.
- `readable.txt` - A human-readable version of the transcript.

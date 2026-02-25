# Transcription Provider Comparison for Async Transcription

A tool for comparing transcription quality and output across multiple third-party providers using Recall.ai's async transcription API.

## What it does

When a meeting recording completes, this tool automatically transcribes the same audio using every configured provider and saves the results side-by-side. This lets you evaluate how each of the transcription providers work for your use case, including:

- **Transcription accuracy** across providers with the same source audio
- **Multilingual support** and code-switching capabilities

This helps you identify which provider works best for your specific use case.

## Output

Results are organized by recording and provider:

```
output/recording-{id}/
├── recallai_async/
│   ├── transcript.json    # Raw transcript data
│   ├── readable.txt       # Human-readable format
│   └── metadata.json      # Provider config and timing
├── assembly_ai_async/
│   └── ...
├── deepgram_async/
│   └── error.json         # Saved if transcription failed
└── ...
```

## Supported Providers

See the [Third-Party Transcription docs](https://docs.recall.ai/docs/ai-transcription) for the full list of supported providers and their configurations. For multilingual and code-switching support, see the [Multilingual Transcription docs](https://docs.recall.ai/docs/multilingual-transcription).

Configure which providers to compare in `src/config/providers.ts`. Each provider requires an API key configured in the [Recall dashboard](https://us-west-2.recall.ai/dashboard/transcription).

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

### 3. Configure providers

Edit `src/config/providers.ts` to enable the providers you want to compare:

```typescript
export const PROVIDER_CONFIGS = [
    { recallai_async: { language_code: "auto" } },
    {
        assembly_ai_async: {
            speech_model: "universal",
            language_detection: true,
        },
    },
    { deepgram_async: { model: "nova-3", language: "multi" } },
    // Uncomment or add more providers as needed
];
```

### 4. Add your webhook URL to the Recall dashboard

Go to the Recall.ai webhooks dashboard for your region and add your ngrok URL as a webhook:

- [`us-east-1` webhooks dashboard](https://us-east-1.recall.ai/dashboard/webhooks)
- [`us-west-2` webhooks dashboard](https://us-west-2.recall.ai/dashboard/webhooks)
- [`eu-central-1` webhooks dashboard](https://eu-central-1.recall.ai/dashboard/webhooks)
- [`ap-northeast-1` webhooks dashboard](https://ap-northeast-1.recall.ai/dashboard/webhooks)

Make sure to subscribe to the following webhook events:

- `recording.done`
- `transcript.done`
- `transcript.failed`

### 5. Start the server

Open this directory in a new terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

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

## Resources

- [Async Transcription](https://docs.recall.ai/docs/async-transcription)
- [Third-Party Providers](https://docs.recall.ai/docs/ai-transcription)
- [Multilingual Transcription](https://docs.recall.ai/docs/multilingual-transcription)

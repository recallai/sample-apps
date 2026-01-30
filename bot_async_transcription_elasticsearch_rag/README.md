# Async Transcription with RAG

This example expands on hybrid diarization example by providing a retrieval augmented generation (RAG) to fetch previous transcripts. 

## What is Retrieval Augmented Generation (RAG)

Retrieval Augmented Generation is a search method that enables large language models (LLMs) to retrieve and incorporate new information.

In this example, we provide a simple RAG server that searches a [ElasticSearch](https://www.elastic.co/elasticsearch/vector-database) vector database for content.

## How It Works

The server listens for webhook events from Recall.ai:

1. When `recording.done` is received, it triggers async transcript creation via Recall's API
2. When `transcript.done` is received, it downloads both the transcript and speaker timeline data, then merges them using the hybrid diarization algorithm. This information is then vectorized and stored in an ElasticSearch database for querying.

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/)
- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/en/download)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

> **Note:** Make sure you don't have any apps running on port 4000 before starting.

### 1. Start docker

Set up an ElasticSearch database and optionally the Kibana dashboard to visualize the data.

```bash
docker compose up -d
```

### 2. Start ngrok

In a terminal window, run:

```bash
ngrok http 4000
```

After it's running, copy the ngrok URL (e.g. `somehash.ngrok-free.app`).

### 3. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Fill out the variables in the `.env` file, including the ngrok domain from step 1 (omit the `https://` protocol).

### 4. Add the ElasticSearch indices

Setup the ElasticSearch database to store transcript data.

```bash
npm run dev:setup
```

The created indices can be found at [Kibana index management](http://localhost:5601/app/management/data/index_management/indices)

### 4. Add your webhook URL to the Recall dashboard

Go to the Recall.ai webhooks dashboard for your region and add your ngrok URL:

- [us-east-1 webhooks dashboard](https://us-east-1.recall.ai/dashboard/webhooks)
- [us-west-2 webhooks dashboard](https://us-west-2.recall.ai/dashboard/webhooks)
- [eu-central-1 webhooks dashboard](https://eu-central-1.recall.ai/dashboard/webhooks)
- [ap-northeast-1 webhooks dashboard](https://ap-northeast-1.recall.ai/dashboard/webhooks)

Subscribe to the following events:

- `recording.done`
- `transcript.done`

### 5. Setup Deepgram Transcription

Go to the Recall.ai transcription dashboard and setup the Deepgram provider. You may choose a different provider by updating [create_async_transcript](./src/api/) 

### 5. Start the server

Open this directory in a new terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 6. Create a bot

You can create a bot using the `run.sh` script or manually with curl.

**Option A: Using run.sh (recommended)**

```bash
chmod +x run.sh
./run.sh
```

**Option B: Using curl**

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

Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own values.

### 7. View the output

The output is 

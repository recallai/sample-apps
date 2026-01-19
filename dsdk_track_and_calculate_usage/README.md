# Track and Calculate DSDK Upload Usage

This example demonstrates how to track and calculate usage for DSDK uploads using the Recall.ai API. It calculates total usage time by fetching recording durations for completed uploads.

## Pre-requisites

-   [Node.js](https://nodejs.org/en/download)
-   [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

### 1. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file:

-   `RECALL_API_KEY` - Your Recall.ai API key
-   `RECALL_REGION` - Your Recall.ai region (e.g., `us-east-1`)

### 2. Install dependencies

Open this directory in a terminal and run:

```bash
npm install
```

### 3. Run the script

Track usage for all DSDK uploads:

```bash
npx ts-node src/index.ts
```

Or filter by date range:

```bash
npx ts-node src/index.ts \
  --started_at__gte "2025-12-01 00:00:00" \
  --started_at__lte "2026-01-01 00:00:00"
```

Or filter by metadata:

```bash
npx ts-node src/index.ts \
  --started_at__gte "2025-12-01 00:00:00" \
  --metadata '{"customer_id":"123"}'
```

### 4. View the output

The script will output progress and final totals:

```
Tracking and calculating usage for dsdk uploads: 2025-12-01 00:00:00 → 2026-01-01 00:00:00

{ pageCount: 100, nextPage: '...' }
Total usage seconds: 63603.88
Total dsdk uploads: 96
...

Total dsdk uploads: 491
Total usage: 85.7550 hours (308718 seconds)
```

## CLI Options

| Option            | Required | Description                                                                       |
| ----------------- | -------- | --------------------------------------------------------------------------------- |
| `--started_at__gte` | No     | Include uploads with `created_at >= this date` (ISO 8601, e.g., "2025-01-01 00:00:00") |
| `--started_at__lte` | No     | Include uploads with `created_at <= this date` (ISO 8601, e.g., "2025-02-01 00:00:00") |
| `--metadata`      | No       | Filter by custom metadata (JSON string, e.g., `'{"customer_id":"123"}'`)          |
| `--help`          | No       | Show help message                                                                 |

## How It Works

1. Fetches paginated DSDK uploads from the API (sorted by `created_at` descending)
2. For each completed upload with a recording, fetches the recording artifact
3. Calculates usage as `completed_at - started_at` for each recording
4. Stops pagination early when all remaining items are before `started_at__gte`
5. Returns total count and usage seconds

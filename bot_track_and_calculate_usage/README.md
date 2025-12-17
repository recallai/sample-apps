# Track and calculate bot usage

This example demonstrates how to retrieve and calculate total bot usage for a given time period using the Recall.ai API.

## Pre-requisites

- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

### 1. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file:

- `RECALL_API_KEY` - Your Recall.ai API key
- `RECALL_REGION` - Your Recall.ai region (e.g., `us-west-2`)

### 2. Install dependencies

Open this directory in a terminal and run:

```bash
npm install
```

### 3. Run the script

Track usage for all bots (all time):

```bash
npx tsx src/index.ts
```

Track usage for bots within a date range:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-11-01 00:00:00" \
  --end_date_utc "2025-12-01 00:00:00"
```

Filter by custom metadata to track usage for a specific customer. This is useful when you pass custom metadata (e.g., `team_id`, `customer_id`) when creating bots:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-11-01 00:00:00" \
  --end_date_utc "2025-12-01 00:00:00" \
  --metadata '{"team_id":"1872"}'
```

### 4. View the output

The script will output the total bot usage in seconds and formatted as hours:

```
Tracking and calculating usage for bots: 2025-11-01 00:00:00 → 2025-12-01 00:00:00

{ pageCount: 100, nextPage: '...' }
...

Total bot usage: 2306.6271 hours (8303858 seconds)
```

## CLI Options

| Option             | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `--start_date_utc` | No       | Include bots with `join_at` >= this date (ISO 8601)                         |
| `--end_date_utc`   | No       | Include bots with `join_at` < this date (ISO 8601)                          |
| `--metadata`       | No       | JSON object to filter by custom bot metadata (e.g., `'{"team_id":"1872"}'`) |
| `--help`           | No       | Show help message                                                           |

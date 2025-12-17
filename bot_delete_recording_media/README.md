# Delete bot's recording media

This example demonstrates how to bulk delete bot recording media using the Recall.ai API.

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

Delete media for all bots that joined after a given date:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-12-15 00:00:00"
```

Delete media for bots within a date range:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --end_date_utc "2025-12-31 00:00:00"
```

Filter by custom metadata to delete media for only specific customer's bots:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --metadata '{"team_id":"1872"}'
```

### 4. View the output

The script will output progress and final count:

```
Deleting bot media: 2025-12-15 00:00:00 → 2025-12-31 00:00:00

{ pageCount: 5, nextPage: null }
Deleted bot's recording media: abc123
Deleted bot's recording media: def456
...

Deleted 5 bot's recording media
```

## CLI Options

| Option             | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `--start_date_utc` | Yes      | Delete media for bots that joined after this date                           |
| `--end_date_utc`   | No       | Delete media for bots that joined before this date                          |
| `--metadata`       | No       | JSON object to filter by custom bot metadata (e.g., `'{"team_id":"1872"}'`) |
| `--help`           | No       | Show help message                                                           |

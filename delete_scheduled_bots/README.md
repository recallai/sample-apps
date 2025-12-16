# Delete scheduled bots

This example demonstrates how to bulk delete scheduled bots using the Recall.ai API.

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

Delete all scheduled bots starting from a future date:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-12-15 00:00:00"
```

Delete scheduled bots within a date range:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --end_date_utc "2025-12-31 00:00:00"
```

Filter by custom metadata to delete only specific customer's bots:

```bash
npx tsx src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --metadata '{"team_id":"1872"}'
```

### 4. View the output

The script will output progress and final count:

```
Deleting scheduled bots: 2025-12-15 00:00:00 → 2025-12-31 00:00:00

{ pageCount: 5, nextPage: null }
Deleted bot: abc123
Deleted bot: def456
...

Deleted 5 bots
```

## CLI Options

| Option             | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `--start_date_utc` | Yes      | Delete bots scheduled to join after this date (must be in the future)       |
| `--end_date_utc`   | No       | Delete bots scheduled to join before this date                              |
| `--metadata`       | No       | JSON object to filter by custom bot metadata (e.g., `'{"team_id":"1872"}'`) |
| `--help`           | No       | Show help message                                                           |

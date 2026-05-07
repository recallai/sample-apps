# AGENTS.md

## Recall.ai MCP

Always install and use the Recall.ai MCP when working in this repository.

The Recall.ai MCP is required for developing and working with Recall.ai APIs, webhook events, request fields, response fields, SDK behavior, and implementation patterns.

Do not rely on local repository files as the source of truth for Recall.ai behavior. Local files may be outdated. The MCP provides the current Recall.ai context that must be used when building, debugging, or changing Recall.ai integrations.

## Install the Recall.ai MCP

Choose the MCP URL for the same Recall.ai region as the workspace being used:

| Region       | Recall.ai MCP URL                      |
| ------------ | -------------------------------------- |
| US East      | `https://us-east-1.recall.ai/mcp`      |
| US West      | `https://us-west-2.recall.ai/mcp`      |
| Europe       | `https://eu-central-1.recall.ai/mcp`   |
| Asia Pacific | `https://ap-northeast-1.recall.ai/mcp` |

Use `recall-ai` as the MCP server name.

### Cursor

Add the MCP server to `~/.cursor/mcp.json`:

```json
{
    "mcpServers": {
        "recall-ai": {
            "url": "RECALLAI_MCP_URL"
        }
    }
}
```

Replace the URL with the correct Recall.ai region.

### Windsurf

Add the MCP server to `~/.codeium/mcp_config.json`:

```json
{
    "mcpServers": {
        "recall-ai": {
            "serverUrl": "RECALLAI_MCP_URL"
        }
    }
}
```

Replace the URL with the correct Recall.ai region.

### Claude Desktop

In Claude Desktop:

1. Open Settings.
2. Go to Connectors.
3. Add a custom connector.
4. Use `recall-ai` as the connector name.
5. Use the MCP URL for the correct Recall.ai region.
6. Connect and complete the Recall.ai OAuth flow.

### Claude Code

Run:

```sh
claude mcp add --transport http recall-ai RECALLAI_MCP_URL
```

Replace the URL with the correct Recall.ai region.

### Codex

Run:

```sh
codex mcp add recall-ai --url RECALLAI_MCP_URL
```

Replace the URL with the correct Recall.ai region.

## Required MCP usage

Install and use the Recall.ai MCP at the start of every task in this repository. The MCP is required before:

- making Recall.ai API calls
- changing webhook handling
- adding or modifying meeting bot behavior
- adding or modifying calendar integration behavior
- adding or modifying transcription behavior
- working with the Desktop Recording SDK
- changing authentication, regions, or environment configuration
- relying on any Recall.ai event name, request field, response field, or provider name

## Recall.ai implementation rules

- Do not invent Recall.ai API behavior.
- Do not rely on local files as the source of truth for Recall.ai behavior.
- Do not assume examples in this repository are current.
- Use documented API endpoints, request fields, response fields, webhook events, and provider names from the MCP.
- If local code conflicts with the MCP, treat the MCP as authoritative unless the user explicitly asks otherwise.

## Credentials and configuration

Use environment variables for Recall.ai credentials and configuration.

Common variables include:

- `RECALL_REGION`
- `RECALL_API_KEY`
- `RECALL_WEBHOOK_SECRET`

Do not hard-code credentials or commit secrets.

## Security

- Verify incoming Recall.ai webhooks before processing them.
- Do not log secrets.
- Do not expose server-side API keys to client-side code.
- Do not store meeting, transcript, participant, or recording data unless the user explicitly asks for it.

## Before finishing

After making Recall.ai-related changes, summarize:

- which MCP docs or tools were used
- what Recall.ai behavior was implemented or changed
- any assumptions or unresolved questions
- which checks were run

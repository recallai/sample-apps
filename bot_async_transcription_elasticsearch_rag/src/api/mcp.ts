import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ollama from "ollama";
import z from "zod";
import type { TranscriptParagraph } from "../schemas/TranscriptParagraphSchema";
import { hybrid_search } from "./elasticsearch";

// Create server instance
const mcp_server = new McpServer({
    name: "recall-videos",
    version: "1.0.0",
});

mcp_server.registerTool(
  "search_recording_transcripts",
  {
    description: "Searches all recordings given a moment in a transcript",
    inputSchema: {
        speaker: z.string().optional().describe("speaker name"),
        search: z.string().optional().describe("concise search phrase"),
        start: z.string().optional().describe("ISO start date"),
        end: z.string().optional().describe("ISO end date"),
    },
  },
  async ({ search, speaker, start, end }) => {
    console.log("searching recording transcripts...", search, speaker, start, end);
    if (!(search || speaker || start || end)) {
      return {
        content: [
          {
            type: "text",
            text: "must provide one search parameter",
          },
        ],
      };
    }

    let videos: TranscriptParagraph[] = [];
    const range = start
      ? {
          start: new Date(Date.parse(start)),
          end: end ? new Date(Date.parse(end)) : undefined,
        }
      : undefined;
    if (search) {
        const embedding = await ollama.embed({
            model: "embeddinggemma",
            input: [ search ],
        });
        videos = await hybrid_search({ search, speaker, range, embedding: embedding.embeddings.at(0) });
    }
    else {
        videos = await hybrid_search({ search, speaker, range });
    }

    const text = `Relevant recordings found: ${videos.length ? JSON.stringify(videos) : "none"}`;
    console.log(`[search_recording_transcripts] Found ${videos.length} relevant recordings`);
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  },
);

export default mcp_server;

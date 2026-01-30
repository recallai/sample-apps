
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ollama from "ollama";
import z from "zod";import type { TranscriptParagraph } from "../schemas/TranscriptParagraphSchema";
import { TranscriptParagraphSchema } from "../schemas/TranscriptParagraphSchema";
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
        speaker: z.string().optional().describe("speaker who spoke the phrase"),
        search: z.string().describe("concise search phrase"),
    },
    outputSchema: {
        videos: TranscriptParagraphSchema.array().describe("relevant videos snippet metadata"),
    },
  },
  async ({ search, speaker }) => {
    let videos: TranscriptParagraph[] = [];
    if (search) {
        const embedding = await ollama.embed({
            model: "embeddinggemma",
            input: [ search ],
        });
        videos = await hybrid_search({ search, speaker, embedding: embedding.embeddings.at(0) });
    }
    else {
        videos = await hybrid_search({ search, speaker });
    }

    const text = `Relevant recordings found: ${videos.map((v) => v.recording_id) ?? "none"}`;
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        videos,
      },
    };
  },
);

export default { mcp_server };
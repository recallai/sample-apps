import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config({});

const client = new Client({
  node: process.env.ELASTIC_SEARCH_URL || "http://localhost:9200",
});

const PARAGRAPH_INDEX_NAME = "paragraphs";
const PARAGRAPH_MAPPINGS = {
  properties: {
    recording_id: {
      type: "keyword" as const,
    },
    recording_created: {
      type: "date" as const,
    },
    speaker: {
      type: "text" as const,
    },
    // Exact phrase matching
    paragraph: {
      type: "text" as const,
      analyzer: "standard",
    },
    // Used for semantic search
    paragraph_vector: {
      type: "dense_vector" as const,
      dims: 768, // embedding model size for Gemma model
      index: true,
      similarity: "cosine",
    },
    start_timestamp: {
      properties: {
        relative: { type: "float" as const },
        absolute: { type: "date" as const },
      },
    },
    end_timestamp: {
      properties: {
        relative: { type: "float" as const },
        absolute: { type: "date" as const },
      },
    },
    duration_seconds: {
      type: "float" as const,
    },
  },
} as const;

/**
 * Creates indices for Elastic Search Models
 */
export async function create_elastic_indices() {
  const paragraph_index = await client.indices.exists({ index: PARAGRAPH_INDEX_NAME });

  if (!paragraph_index) {
    await client.indices.create({
      index: PARAGRAPH_INDEX_NAME,
      mappings: PARAGRAPH_MAPPINGS,
    });
  } else {
    await client.indices.putMapping({
      index: PARAGRAPH_INDEX_NAME,
      properties: PARAGRAPH_MAPPINGS.properties,
    });
  }
}

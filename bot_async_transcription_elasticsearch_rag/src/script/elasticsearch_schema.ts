import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config({});

const client = new Client({
  node: process.env.ELASTIC_SEARCH_URL || "http://localhost:9200",
});

const INDEX_NAME = "paragraphs";

/**
 * Creates indices for Elastic Search Models
 */
export async function create_elastic_indices() {
  const paragraph_index = await client.indices.exists({ index: INDEX_NAME });

  if (!paragraph_index) {
    await client.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          recording_id: {
            type: "keyword",
          },
          speaker: {
            type: "keyword",
          },
          // Exact phrase matching
          paragraph: {
            type: "text",
            analyzer: "standard",
          },
          // Used for semantic search
          paragraph_vector: {
            type: "dense_vector",
            dims: 768, // embedding model size for Gemma model
            index: true,
            similarity: "cosine",
          },
          start_timestamp: {
            properties: {
              relative: { type: "float" },
              absolute: { type: "date" },
            },
          },
          end_timestamp: {
            properties: {
              relative: { type: "float" },
              absolute: { type: "date" },
            },
          },
          duration_seconds: {
            type: "float",
          },
        },
      },
    });
  }
}

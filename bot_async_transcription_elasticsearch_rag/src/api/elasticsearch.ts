import { Client } from "@elastic/elasticsearch";
import type { TranscriptParagraph } from "../schemas/TranscriptParagraphSchema";

const client = new Client({
  node: "http://localhost:9200",
});

const INDEX_NAME = "paragraphs";

/**
 * Indexes a transcript paragraph in Elasticsearch with its embedding vector.
 */
export async function create_index_paragraph(
  id: string,
  paragraph: TranscriptParagraph,
  recording_created: Date,
  embedding: number[],
) {
  await client.index({
    index: INDEX_NAME,
    id,
    document: {
      ...paragraph,
      recording_created,
      paragraph_vector: embedding,
    },
  });
}

/**
 * Performs a hybrid search on the Elasticsearch index for transcript paragraphs.
 * Supports both keyword and vector (embedding) search, with optional filters for speaker and date range.
 */
export async function hybrid_search({
  search,
  embedding,
  size = 10,
  speaker,
  range,
}: {
  search?: string;
  embedding?: number[];
  size?: number;
  speaker?: string;
  range?: {
    start: Date;
    end?: Date;
  };
}) {
  const must: any[] = [];
  if (search) {
    must.push({
      match: {
        paragraph: {
          query: search,
          boost: 1.0,
        },
      },
    });
  }

  const filter: any[] = [];
  if (speaker) {
    // Use match_phrase_prefix for partial speaker name matching
    filter.push({
      match_phrase_prefix: {
        speaker: speaker,
      },
    });
  }

  if (range) {
    filter.push({
      range: {
        recording_created: {
          gte: range.start.toISOString(),
          ...(range.end ? { lte: range.end.toISOString() } : {}),
        },
      },
    });
  }

  const response = await client.search<TranscriptParagraph>({
    index: INDEX_NAME,
    size,
    query: {
      bool: {
        must,
        filter,
      },
    },
    knn: embedding
      ? {
          field: "paragraph_vector",
          query_vector: embedding,
          k: size,
          num_candidates: 100,
          boost: 2.0,
          filter, // pass the full filter array
        }
      : undefined,
    _source: [
      "recording_id",
      "recording_created",
      "speaker",
      "paragraph",
      "start_timestamp",
      "end_timestamp",
      "duration_seconds",
    ],
  });

  return response.hits.hits
    .map((hit) => hit._source)
    .filter((v) => v !== undefined);
}

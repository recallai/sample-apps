import { Client } from "@elastic/elasticsearch";
import type { TranscriptParagraph } from "../schemas/TranscriptParagraphSchema";

const client = new Client({
  node: "http://localhost:9200",
});

const INDEX_NAME = "paragraphs";

export async function create_index_paragraph(
  id: string,
  paragraph: TranscriptParagraph,
  embedding: number[],
) {
  await client.index({
    index: INDEX_NAME,
    id,
    document: {
      ...paragraph,
      paragraph_vector: embedding,
    },
  });
}

export async function hybrid_search({
  search,
  embedding,
  size = 10,
  speaker,
}: {
  search: string;
  embedding?: number[];
  size?: number;
  speaker?: string;
}) {
  const response = await client.search<TranscriptParagraph>({
    index: INDEX_NAME,
    size,
    query: {
      bool: {
        must: [
          {
            match: {
              paragraph: {
                query: search,
                boost: 1.0,
              },
            },
          },
        ],
        filter: speaker
          ? [
              {
                term: {
                  speaker: speaker, // exact match
                },
              },
            ]
          : [],
      },
    },
    knn: embedding
      ? {
          field: "paragraph_vector",
          query_vector: embedding,
          k: size,
          num_candidates: 100,
          boost: 2.0,
          filter: speaker
            ? {
                term: {
                  speaker: speaker,
                },
              }
            : undefined,
        }
      : undefined,
    _source: [
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

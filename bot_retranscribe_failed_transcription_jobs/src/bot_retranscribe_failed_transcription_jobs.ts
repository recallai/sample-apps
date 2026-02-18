import { z } from "zod";
import { env } from "./config/env";
import { fetch_with_retry } from "./fetch_with_retry";
import { BotArtifactSchema } from "./schemas/BotArtifactSchema";

/**
 * Retranscribe failed transcription jobs by creating async transcript jobs for recordings.
 */
export async function bot_retranscribe_failed_transcription_jobs(args: any) {
    const { start_date_utc, end_date_utc, metadata, transcript_config } = z.object({
        start_date_utc: z.string(),
        end_date_utc: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
        transcript_config: z.record(z.string(), z.unknown()),
    }).parse(args);

    let count = 0;
    let skipped = 0;
    let next: string | null = null;
    do {
        const page = await list_bots({
            join_at_after: start_date_utc,
            join_at_before: end_date_utc,
            metadata,
            next,
        });
        console.log({ pageCount: page.results.length, nextPage: page.next });

        await Promise.all(page.results.map(async (bot) => {
            const recordings = bot.recordings || [];
            if (recordings.length === 0) {
                console.log(`Bot ${bot.id} has no recordings, skipping`);
                skipped++;
                return;
            }

            for (const recording of recordings) {
                const recording_id = recording.id;
                try {
                    await create_async_transcript_job({ recording_id, transcript_config });
                    console.log(`Created transcript job for recording: ${recording_id} (bot: ${bot.id})`);
                    count++;
                } catch (error) {
                    console.error(`Failed to create transcript job for recording ${recording_id}: ${error}`);
                }
            }
        }));
        next = page.next;
    } while (next);

    return { count, skipped };
}

/**
 * Filters bots by the given arguments.
 * Returns a page of bots and the next page URL to fetch the next page of bots.
 */
async function list_bots(args: {
    next?: string | null; // next page URL
    join_at_after?: string; // ISO 8601, e.g. "2025-12-15 00:00:00"
    join_at_before?: string; // ISO 8601, e.g. "2025-12-15 00:25:00"
    metadata?: Record<string, string>; // add one key-value pair
}) {
    const { next, join_at_after, join_at_before, metadata } = z.object({
        next: z.string().nullable(),
        join_at_after: z.string().optional(),
        join_at_before: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
    }).parse(args);

    const url = next
        ? new URL(next)
        : new URL(`https://${env.RECALL_REGION}.recall.ai/api/v1/bot`);
    if (!next) {
        ["done", "analysis_failed"].forEach((status) => {
            url.searchParams.append("status", status);
        });
        if (join_at_after) url.searchParams.set("join_at_after", join_at_after);
        if (join_at_before) url.searchParams.set("join_at_before", join_at_before);
        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                url.searchParams.set(`metadata__${key}`, value);
            }
        }
    }

    const response = await fetch_with_retry(url.toString(), {
        method: "GET",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());

    return z.object({
        results: BotArtifactSchema.array(),
        next: z.string().nullable(),
    }).parse(await response.json());
}

/**
 * Creates an async transcript job for a recording.
 * API Docs: https://docs.recall.ai/reference/recording_create_transcript_create
 */
async function create_async_transcript_job(args: {
    recording_id: string;
    transcript_config: Record<string, unknown>;
}) {
    const { recording_id, transcript_config } = z.object({
        recording_id: z.string(),
        transcript_config: z.record(z.string(), z.unknown()),
    }).parse(args);

    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/create_transcript/`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(transcript_config),
    });
    if (!response.ok) throw new Error(await response.text());

    return response.json();
}

import { z } from "zod";
import { env } from "./config/env";
import { fetch_with_retry } from "./fetch_with_retry";
import { BotSchema } from "./schemas/BotSchema";

/**
 * Delete bot's recording media after a given date.
 */
export async function delete_bot_recording_media(args: any) {
    const { start_date_utc, end_date_utc, metadata } = z.object({
        start_date_utc: z.string(),
        end_date_utc: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
    }).parse(args);

    let count = 0;
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
            await delete_bot_media_by_id({ bot_id: bot.id });
            console.log(`Deleted bot's recording media: ${bot.id}`);
        }));
        count += page.results.length;
        next = page.next;
    } while (next);

    return { count };
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
        // Only include bots that have finished (have recording media to delete)
        ["done", "analysis_done", "analysis_failed", "fatal"].forEach((status) => {
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
        results: BotSchema.array(),
        next: z.string().nullable(),
    }).parse(await response.json());
}

/**
 * Deletes a bot's recording media by its ID.
 */
async function delete_bot_media_by_id(args: {
    bot_id: string;
}) {
    const { bot_id } = z.object({ bot_id: z.string() }).parse(args);

    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v1/bot/${bot_id}/delete_media/`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());
}
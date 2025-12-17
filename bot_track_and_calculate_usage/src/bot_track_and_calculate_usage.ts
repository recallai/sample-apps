import { z } from "zod";
import { env } from "./config/env";
import { fetch_with_retry } from "./fetch_with_retry";
import { BotSchema } from "./schemas/BotSchema";

/**
 * Retrieve the usage for bots.
 * Pass one or several of the following arguments to filter usage for a specific time period or metadata.
 * For example:
 * - Setting `start_date_utc` will only include bots whose `join_at` is >= the given time.
 * - Setting `end_date_utc` will only include bots whose `join_at` is < the given time.
 * - Setting `metadata` will only include bots that have the given metadata key-value pair (e.g. for a specific customer).
 */
export async function bot_track_and_calculate_usage(args: any) {
    const { start_date_utc, end_date_utc, metadata } = z.object({
        start_date_utc: z.string().optional(),
        end_date_utc: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
    }).parse(args);

    let total_usage_seconds = 0;
    let next: string | null = null;
    do {
        const page = await list_bots({
            join_at_after: start_date_utc,
            join_at_before: end_date_utc,
            metadata,
            next,
        });
        console.log({ pageCount: page.results.length, nextPage: page.next });

        const total_usage_seconds_per_bot = page.results.map((bot) => get_usage_seconds_for_bot({ bot }));
        const total_usage_seconds_for_page = total_usage_seconds_per_bot.reduce((acc, curr) => acc + curr, 0);
        total_usage_seconds += total_usage_seconds_for_page;
        next = page.next;
    } while (next);

    return total_usage_seconds;
}

/**
 * Filters bots by the given arguments.
 * Returns a page of bots and the next page URL to fetch the next page of bots.
 * 
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
 * Gets the usage for a single bot.
 */
function get_usage_seconds_for_bot(args: {
    bot: { id: string; status_changes: { code: string; created_at: string; }[]; }
}) {
    const { bot } = z.object({ bot: BotSchema }).parse(args);

    const joining_call_status = bot.status_changes.find((status) => status.code === "joining_call");
    const termination_status = bot.status_changes.find((status) => ["done", "fatal"].includes(status.code));
    if (!joining_call_status || !termination_status) {
        console.error(`Bot ${bot.id} has no joining call status or termination status`);
        return 0;
    }
    const joining_call_time = new Date(joining_call_status.created_at);
    const termination_time = new Date(termination_status.created_at);
    return (termination_time.getTime() - joining_call_time.getTime()) / 1000;
}

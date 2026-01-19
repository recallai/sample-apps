import { z } from "zod";
import { env } from "./config/env";
import { fetch_with_retry } from "./fetch_with_retry";
import { DSDKUploadArtifactSchema } from "./schemas/DSDKUploadArtifactSchema";
import { RecordingArtifactSchema } from "./schemas/RecordingArtifactSchema";

/**
 * Track and calculate usage for dsdk uploads.
 * Pass one or several of the following arguments to filter usage for a specific time period or metadata.
 * For example:
 * - Setting `started_at__gte` will only include uploads whose `created_at` is >= the given time.
 * - Setting `started_at__lte` will only include uploads whose `created_at` is <= the given time.
 * - Setting `metadata` will only include uploads that have the given metadata key-value pair (e.g. for a specific customer).
 */
export async function dsdk_track_and_calculate_usage(args: any) {
    const { started_at__gte, started_at__lte, metadata } = z.object({
        started_at__gte: z.string().optional(),
        started_at__lte: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
    }).parse(args);

    let count = 0;
    let usage_seconds = 0;
    let next: string | null = null;
    let should_stop = false;

    do {
        const page = await list_dsdk_uploads({
            next,
        });
        console.log({ pageCount: page.results.length, nextPage: page.next });

        // Results are sorted by created_at descending (newest first).
        // If the oldest item (last in page) is before started_at__gte, this is our last page.
        if (started_at__gte && page.results.length > 0) {
            const oldest_in_page = page.results[page.results.length - 1];
            if (oldest_in_page.created_at < started_at__gte) {
                should_stop = true;
            }
        }

        await Promise.all(page.results.map(async (dsdk_upload) => {
            try {
                if (!dsdk_upload.recording_id) return;
                if (dsdk_upload.status.code !== "complete") return;
                // Skip items outside the date range
                if (started_at__gte && dsdk_upload.created_at < started_at__gte) return;
                if (started_at__lte && dsdk_upload.created_at > started_at__lte) return;
                if (metadata && !Object.entries(metadata).every(([key, value]) => dsdk_upload.metadata[key] === value)) return;

                const recording_artifact = await retrieve_recording_artifact({ recording_id: dsdk_upload.recording_id });
                if (!recording_artifact.completed_at) {
                    console.log(`Recording ${recording_artifact.id} is not complete yet`);
                    return;
                }
                usage_seconds += (new Date(recording_artifact.completed_at).getTime() - new Date(recording_artifact.started_at).getTime()) / 1000;
                count += 1;
            } catch (error) {
                console.error(`Error finding dsdk upload: ${dsdk_upload.id}, error=${error}`);
                return;
            }
        }));

        next = page.next;
        console.log(`Total usage seconds: ${usage_seconds}`);
        console.log(`Total dsdk uploads: ${count}`);
    } while (next && !should_stop);

    return { count, usage_seconds };
}

/**
 * Filters dsdk uploads by the given arguments.
 * Returns a page of dsdk uploads and the next page URL to fetch the next page of dsdk uploads.
 */
async function list_dsdk_uploads(args: {
    next?: string | null; // next page URL
}) {
    const { next } = z.object({
        next: z.string().nullable(),
    }).parse(args);

    const url = next
        ? new URL(next)
        : new URL(`https://${env.RECALL_REGION}.recall.ai/api/v1/sdk_upload`);
    if (!next) {
        // Only include dsdk uploads that have finished processing
        ["done", "analysis_done", "analysis_failed", "fatal"].forEach((status) => {
            url.searchParams.append("status", status);
        });
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
        results: DSDKUploadArtifactSchema.array(),
        next: z.string().nullable(),
    }).parse(await response.json());
}

/**
 * Retrieves a single recording artifact.
 */
async function retrieve_recording_artifact(args: { recording_id: string }) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);
    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/`, {
        method: "GET",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());
    return RecordingArtifactSchema.parse(await response.json());
}
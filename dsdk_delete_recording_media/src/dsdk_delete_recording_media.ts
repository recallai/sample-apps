import { z } from "zod";
import { env } from "./config/env";
import { fetch_with_retry } from "./fetch_with_retry";
import { DSDKUploadArtifactSchema } from "./schemas/DSDKUploadArtifactSchema";

/**
 * Delete all dsdk upload recording media.
 */
export async function dsdk_delete_recording_media() {
    let count = 0;
    let next: string | null = null;
    do {
        const page = await list_dsdk_uploads({
            next,
        });
        console.log({ pageCount: page.results.length, nextPage: page.next });

        await Promise.all(page.results.map(async (dsdk_upload) => {
            await delete_dsdk_upload_media_by_recording_id({ recording_id: dsdk_upload.recording_id });
            console.log(`Deleted dsdk upload's recording media: ${dsdk_upload.recording_id}`);
        }));
        count += page.results.length;
        next = page.next;
    } while (next);

    return { count };
}

/**
 * Filters dsdk uploads.
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
        // Only include dsdk uploads that have finished (have recording media to delete)
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
 * Deletes a DSDK upload's recording media by its recording ID.
 */
async function delete_dsdk_upload_media_by_recording_id(args: {
    recording_id: string;
}) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);

    const response = await fetch_with_retry(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());
}
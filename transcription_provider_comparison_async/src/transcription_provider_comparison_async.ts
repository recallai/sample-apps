import fs from "fs";
import path from "path";
import { z } from "zod";
import { env } from "./config/env";
import { PROVIDER_CONFIGS, type ProviderConfig, get_provider_name } from "./config/providers";
import { convert_to_readable_transcript } from "./convert_to_readable_transcript";
import { fetch_with_retry } from "./fetch_with_retry";
import { TranscriptArtifactEventSchema, type TranscriptArtifactEventType } from "./schemas/TranscriptArtifactEventSchema";
import { TranscriptArtifactSchema, get_provider_name as get_transcript_provider_name } from "./schemas/TranscriptArtifactSchema";
import { TranscriptPartSchema } from "./schemas/TranscriptPartSchema";

/**
 * Create async transcript jobs for all configured providers.
 * Each provider will generate a separate transcript for comparison.
 */
export async function create_async_transcripts_for_all_providers(args: { recording_id: string }) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);

    const provider_names = PROVIDER_CONFIGS.map(get_provider_name);
    console.log(`[Recording=${recording_id}] Creating transcripts for ${PROVIDER_CONFIGS.length} providers: ${provider_names.join(", ")}`);

    const results = await Promise.allSettled(
        PROVIDER_CONFIGS.map((provider) => create_async_transcript({ recording_id, provider })),
    );

    const summary = results.map((result, i) => ({
        provider: get_provider_name(PROVIDER_CONFIGS[i]),
        status: result.status,
        transcript_id: result.status === "fulfilled" ? result.value.id : null,
        error: result.status === "rejected" ? String(result.reason) : null,
    }));

    console.log(`[Recording=${recording_id}] Transcript creation results:`, JSON.stringify(summary, null, 2));

    return summary;
}

/**
 * Create an async transcript job for a specific provider.
 */
async function create_async_transcript(args: { recording_id: string; provider: ProviderConfig }) {
    const { recording_id, provider } = args;

    const response = await fetch_with_retry(
        `https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/create_transcript/`,
        {
            method: "POST",
            headers: {
                "Authorization": `${env.RECALL_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                provider,
                diarization: { use_separate_streams_when_available: true },
                metadata: {
                    provider_name: get_provider_name(provider),
                },
            }),
        },
    );

    if (!response.ok) {
        const error_text = await response.text();
        throw new Error(`Failed to create transcript with ${get_provider_name(provider)}: ${error_text}`);
    }

    return TranscriptArtifactSchema.parse(await response.json());
}

/**
 * Retrieve and save the transcript for a specific provider.
 */
export async function save_provider_transcript(args: { msg: TranscriptArtifactEventType }) {
    const { msg } = z.object({ msg: TranscriptArtifactEventSchema }).parse(args);

    const transcript = await retrieve_transcript({ transcript_id: msg.data.transcript.id });
    const provider_name = get_transcript_provider_name(transcript);

    if (!transcript.data.download_url) {
        throw new Error(`[${provider_name}] Transcript download URL is null`);
    }

    const transcript_parts = await retrieve_transcript_parts({ download_url: transcript.data.download_url });
    const readable_transcript = convert_to_readable_transcript({ transcript_parts });

    const output_dir = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/${provider_name}`,
    );
    fs.mkdirSync(output_dir, { recursive: true });

    fs.writeFileSync(
        path.join(output_dir, "transcript.json"),
        JSON.stringify(transcript_parts, null, 2),
    );

    fs.writeFileSync(
        path.join(output_dir, "readable.txt"),
        readable_transcript.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n"),
    );

    fs.writeFileSync(
        path.join(output_dir, "metadata.json"),
        JSON.stringify(transcript, null, 2),
    );

    return { provider_name, transcript_parts, readable_transcript };
}

/**
 * Retrieve transcript artifact by ID.
 */
async function retrieve_transcript(args: { transcript_id: string }) {
    const { transcript_id } = z.object({ transcript_id: z.string() }).parse(args);

    const response = await fetch_with_retry(
        `https://${env.RECALL_REGION}.recall.ai/api/v1/transcript/${transcript_id}/`,
        {
            method: "GET",
            headers: {
                "Authorization": `${env.RECALL_API_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    if (!response.ok) throw new Error(await response.text());
    return TranscriptArtifactSchema.parse(await response.json());
}

/**
 * Retrieve transcript parts from download URL.
 */
async function retrieve_transcript_parts(args: { download_url: string }) {
    const { download_url } = z.object({ download_url: z.string() }).parse(args);

    const response = await fetch(download_url);
    if (!response.ok) throw new Error(await response.text());

    return TranscriptPartSchema.array().parse(await response.json());
}

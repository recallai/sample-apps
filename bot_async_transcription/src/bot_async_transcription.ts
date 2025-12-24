import fs from "fs";
import path from "path";
import { z } from "zod";
import { env } from "./config/env";
import { RecordingArtifactSchema } from "./schemas/RecordingArtifactSchema";
import { TranscriptArtifactEventSchema, type TranscriptArtifactEventType } from "./schemas/TranscriptArtifactEventSchema";
import { TranscriptArtifactSchema } from "./schemas/TranscriptArtifactSchema";
import { TranscriptPartSchema } from "./schemas/TranscriptPartSchema";
import { convert_to_readable_transcript } from "./convert_to_readable_transcript";

/**
 * Create an async transcript job for a recording.
 * A `transcript.done` or `transcript.failed` webhook event will be sent when the job has completed and the transcript is ready.
 */
export async function create_async_transcript(args: { recording_id: string }) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);
    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/create_transcript/`, {
        method: "POST",
        headers: {
            "Authorization": env.RECALL_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            provider: { recallai_async: {} },
            // Enable perfect diarization by default if separate streams are available.
            diarization: { use_separate_streams_when_available: true },
        }),
    });
    if (!response.ok) throw new Error(await response.text());
    return TranscriptArtifactSchema.parse(await response.json());
}

/*
 * Retrieve and save the transcript.
 */
export async function bot_async_transcription(args: { msg: TranscriptArtifactEventType }) {
    const { msg } = z.object({ msg: TranscriptArtifactEventSchema }).parse(args);

    const recording = await retrieve_recording_artifact({ recording_id: msg.data.recording.id });
    if (!recording.media_shortcuts?.transcript?.data?.download_url) {
        throw new Error("Transcript download URL is null");
    }

    // Retrieve and format transcript data.
    const transcript_parts = await retrieve_transcript_parts({
        download_url: recording.media_shortcuts.transcript.data.download_url,
    });
    const readable_transcript_parts = convert_to_readable_transcript({ transcript_parts });

    // Write the transcript parts data and readable transcript to files.
    const output_path_events = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/transcript.json`,
    );
    if (!fs.existsSync(output_path_events)) {
        fs.mkdirSync(path.dirname(output_path_events), { recursive: true });
        fs.writeFileSync(output_path_events, "[]", { flag: "w+" });
    }
    fs.writeFileSync(output_path_events, JSON.stringify(transcript_parts, null, 2), { flag: "w+" });

    // Write the readable transcript to a file.
    const output_path_readable = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/readable.txt`,
    );
    if (!fs.existsSync(output_path_readable)) {
        fs.mkdirSync(path.dirname(output_path_readable), { recursive: true });
        fs.writeFileSync(output_path_readable, "", { flag: "w+" });
    }
    fs.writeFileSync(output_path_readable, readable_transcript_parts.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n"), { flag: "w+" });

    // Return the transcript parts and readable transcript.
    return {
        transcript_parts,
        readable_transcript_parts,
    };
}

/**
 * Retrieve the recording artifact.
 */
async function retrieve_recording_artifact(args: { recording_id: string }) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);
    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/`, {
        method: "GET",
        headers: {
            "Authorization": env.RECALL_API_KEY,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) throw new Error(await response.text());
    return RecordingArtifactSchema.parse(await response.json());
}

/**
 * Retrieve the transcript parts from the transcript artifact's `download_url`.
 */
async function retrieve_transcript_parts(args: { download_url: string }) {
    const { download_url } = z.object({ download_url: z.string() }).parse(args);

    const response = await fetch(download_url);
    if (!response.ok) throw new Error(await response.text());

    return TranscriptPartSchema.array().parse(await response.json());
}

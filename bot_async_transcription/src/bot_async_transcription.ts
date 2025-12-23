import fs from "fs";
import path from "path";
import { z } from "zod";
import { env } from "./config/env";
import { RecordingArtifactSchema } from "./schemas/RecordingArtifactSchema";
import { TranscriptArtifactSchema } from "./schemas/TranscriptArtifactSchema";
import { TranscriptArtifactEventSchema, type TranscriptArtifactEventType } from "./schemas/TranscriptArtifactEventSchema";
import { TranscriptPartSchema, type TranscriptPartType } from "./schemas/TranscriptPartSchema";

export async function create_async_transcript(args: { recording_id: string }) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);
    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/create_transcript/`, {
        method: "POST",
        headers: {
            "Authorization": env.RECALL_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            provider: { recallai_async: { diarize: true } },
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
    const transcript_data = await retrieve_transcript_data({
        download_url: recording.media_shortcuts.transcript.data.download_url,
    });
    const transcript_parts = format_transcript_by_sentences(transcript_data);

    // Create the output files.
    const output_path_events = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/transcript.json`,
    );
    const output_path_readable = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/dialogue.txt`,
    );
    if (!fs.existsSync(output_path_events)) {
        fs.mkdirSync(path.dirname(output_path_events), { recursive: true });
        fs.writeFileSync(output_path_events, "[]", { flag: "w+" });
    }
    if (!fs.existsSync(output_path_readable)) {
        fs.mkdirSync(path.dirname(output_path_readable), { recursive: true });
        fs.writeFileSync(output_path_readable, "", { flag: "w+" });
    }

    // Write the transcript data and dialogue to files.
    fs.writeFileSync(output_path_events, JSON.stringify(transcript_parts, null, 2), { flag: "w+" });
    fs.writeFileSync(output_path_readable, transcript_parts.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n"), { flag: "w+" });

    return transcript_parts;
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
async function retrieve_transcript_data(args: { download_url: string }) {
    const { download_url } = z.object({ download_url: z.string() }).parse(args);

    const response = await fetch(download_url);
    if (!response.ok) throw new Error(await response.text());

    return TranscriptPartSchema.array().parse(await response.json());
}

/**
 * Parse the transcript data into a separate sentences for each participant.
 */
function format_transcript_by_sentences(transcript: TranscriptPartType[]) {
    if (!Array.isArray(transcript)) return [];
    const keepers = [];
    for (const entry of transcript) {
        const participant = entry?.participant;
        const words = Array.isArray(entry?.words) ? entry.words : [];
        if (!participant?.name || words.length === 0) continue;
        const key = participant.id ?? participant.name;
        const last = keepers[keepers.length - 1];
        const last_key = last && (last.participant.id ?? last.participant.name);
        if (last && key === last_key) {
            last.words.push(...words);
        } else {
            keepers.push(entry);
        }
    }

    // Map merged entries to paragraphs with timestamps + duration
    return keepers
        .map(({ participant, words }) => {
            const paragraph = words.map((w) => w.text).join(" ").trim();
            if (!paragraph) return null;

            // First word with a start timestamp; last word with an end timestamp (words assumed chronological).
            const first = words.find((w) => w?.start_timestamp);
            const last = [...words].reverse().find((w) => w?.end_timestamp);

            const start_relative = first?.start_timestamp?.relative ?? null;
            const start_absolute = first?.start_timestamp?.absolute ?? null;
            const end_relative = last?.end_timestamp?.relative ?? null;
            const end_absolute = last?.end_timestamp?.absolute ?? null;

            // Duration: prefer relative seconds; else compute from ISO absolute timestamps.
            const duration_seconds =
                start_relative !== null && end_relative !== null
                    ? end_relative - start_relative
                    : (start_absolute && end_absolute ? (Date.parse(end_absolute) - Date.parse(start_absolute)) / 1000 : null);

            return {
                speaker: participant.name,
                paragraph,
                start_timestamp: { relative: start_relative, absolute: start_absolute },
                end_timestamp: { relative: end_relative, absolute: end_absolute },
                duration_seconds,
            };
        })
        .filter(Boolean);
}

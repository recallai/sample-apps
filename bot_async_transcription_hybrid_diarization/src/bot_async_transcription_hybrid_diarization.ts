import fs from "fs";
import path from "path";
import { z } from "zod";
import { env } from "./config/env";
import { convert_to_hybrid_diarized_transcript_parts } from "./convert_to_hybrid_diarized_transcript_parts";
import { convert_to_readable_transcript } from "./convert_to_readable_transcript";
import { ParticipantPartSchema } from "./schemas/ParticipantPartSchema";
import { RecordingArtifactSchema } from "./schemas/RecordingArtifactSchema";
import { TranscriptArtifactEventSchema, type TranscriptArtifactEventType } from "./schemas/TranscriptArtifactEventSchema";
import { TranscriptArtifactSchema } from "./schemas/TranscriptArtifactSchema";
import { TranscriptPartSchema } from "./schemas/TranscriptPartSchema";

/**
 * Create an async transcript job for a recording.
 * A `transcript.done` or `transcript.failed` webhook event will be sent when the job has completed and the transcript is ready.
 */
export async function create_async_transcript(args: { recording_id: string }) {
    const { recording_id } = z.object({ recording_id: z.string() }).parse(args);
    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/recording/${recording_id}/create_transcript/`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            provider: { deepgram_async: { diarize: true } },
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
    console.log(`Retrieved recording: ${recording.id}`);

    if (!recording.media_shortcuts?.transcript?.data?.download_url) {
        throw new Error("Transcript download URL is null");
    }
    if (!recording.media_shortcuts.participant_events?.data?.participants_download_url) {
        throw new Error("Participants download URL is null");
    }

    // Retrieve and format transcript data.
    const transcript_parts = await retrieve_transcript_parts({
        download_url: recording.media_shortcuts.transcript.data.download_url,
    });
    console.log(`Retrieved ${transcript_parts.length} transcript parts`);
    const participants = await retrieve_participants({
        download_url: recording.media_shortcuts.participant_events.data.participants_download_url,
    });
    console.log(`Retrieved ${participants.length} participants`);
    const hybrid_transcript_parts = convert_to_hybrid_diarized_transcript_parts({
        transcript_parts,
        participants,
    });
    console.log(`Formatted ${hybrid_transcript_parts.length} hybrid transcript parts`);
    const readable_hybrid_transcript_parts = convert_to_readable_transcript({ transcript_parts: hybrid_transcript_parts });
    console.log(`Formatted ${readable_hybrid_transcript_parts.length} readable hybrid transcript parts`);

    const output_dir = path.join(process.cwd(), `output/recording-${msg.data.recording.id}`);
    fs.mkdirSync(output_dir, { recursive: true });

    // Write the participants list to a file.
    const output_path_participants = path.join(output_dir, "participants.json");
    fs.writeFileSync(output_path_participants, JSON.stringify(participants, null, 2), { flag: "w+" });

    // Write the raw transcript parts to a file.
    const output_path_transcript = path.join(output_dir, "transcript.json");
    fs.writeFileSync(output_path_transcript, JSON.stringify(transcript_parts, null, 2), { flag: "w+" });

    // Write the hybrid diarized transcript parts to a file.
    const output_path_hybrid = path.join(output_dir, "hybrid_diarization_transcript.json");
    fs.writeFileSync(output_path_hybrid, JSON.stringify(hybrid_transcript_parts, null, 2), { flag: "w+" });

    // Write the readable hybrid diarized transcript to a file.
    const output_path_readable = path.join(output_dir, "hybrid_diarization_transcript.txt");
    fs.writeFileSync(output_path_readable, readable_hybrid_transcript_parts.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n"), { flag: "w+" });

    // Return the transcript parts and human-readable transcript.
    return {
        transcript_parts: hybrid_transcript_parts,
        readable_transcript_parts: readable_hybrid_transcript_parts,
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
            "Authorization": `${env.RECALL_API_KEY}`,
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

/**
 * Retrieve the participants list from the participant events artifact's `participants_download_url`.
 */
async function retrieve_participants(args: { download_url: string }) {
    const { download_url } = z.object({ download_url: z.string() }).parse(args);

    const response = await fetch(download_url);
    if (!response.ok) throw new Error(await response.text());

    return ParticipantPartSchema.array().parse(await response.json());
}

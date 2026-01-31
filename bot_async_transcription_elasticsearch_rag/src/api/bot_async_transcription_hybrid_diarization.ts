import ollama from "ollama";
import { z } from "zod";
import { env } from "../config/env";
import { RecordingArtifactSchema } from "../schemas/RecordingArtifactSchema";
import { SpeakerTimelinePartSchema } from "../schemas/SpeakerTimelinePartSchema";
import { TranscriptArtifactEventSchema, type TranscriptArtifactEventType } from "../schemas/TranscriptArtifactEventSchema";
import { TranscriptArtifactSchema } from "../schemas/TranscriptArtifactSchema";
import { TranscriptPartSchema } from "../schemas/TranscriptPartSchema";
import { convert_to_hybrid_diarized_transcript_parts } from "./convert_to_hybrid_diarized_transcript_parts";
import { convert_to_readable_transcript } from "./convert_to_readable_transcript";
import { create_index_paragraph } from "./elasticsearch";

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
        }),
    });
    if (!response.ok) throw new Error(await response.text());
    return TranscriptArtifactSchema.parse(await response.json());
}

/*
 * Retrieve and save the transcript.
 */
export async function bot_async_transcription(args: { msg: TranscriptArtifactEventType, recording_id: string }) {
    const { msg, recording_id } = z.object({ msg: TranscriptArtifactEventSchema, recording_id: z.string() }).parse(args);

    const recording = await retrieve_recording_artifact({ recording_id: msg.data.recording.id });
    console.log(`Retrieved recording: ${recording.id}`);

    if (!recording.media_shortcuts?.transcript?.data?.download_url) {
        throw new Error("Transcript download URL is null");
    }
    if (!recording.media_shortcuts.participant_events?.data?.speaker_timeline_download_url) {
        throw new Error("Speaker timeline download URL is null");
    }

    // Retrieve and format transcript data.
    const transcript_parts = await retrieve_transcript_parts({
        download_url: recording.media_shortcuts.transcript.data.download_url,
    });
    console.log(`Retrieved ${transcript_parts.length} transcript parts`);
    const speaker_timeline_data = await retrieve_speaker_timeline_parts({
        download_url: recording.media_shortcuts.participant_events.data.speaker_timeline_download_url,
    });
    console.log(`Retrieved ${speaker_timeline_data.length} speaker timeline parts`);
    const hybrid_transcript_parts = convert_to_hybrid_diarized_transcript_parts({
        transcript_parts,
        speaker_timeline_data,
    });
    // console.log("transcript words:", hybrid_transcript_parts.at(0)?.words);
    console.log(`Formatted ${hybrid_transcript_parts.length} hybrid transcript parts`);
    const readable_hybrid_transcript_parts = convert_to_readable_transcript({ transcript_parts: hybrid_transcript_parts, recording_id });
    console.log(`Formatted ${readable_hybrid_transcript_parts.length} readable hybrid transcript parts`);
    console.log("transcript:", readable_hybrid_transcript_parts);

    // Batch elastic embeddings
    const paragraphs = readable_hybrid_transcript_parts.map((p) => p.paragraph);
    console.log(`Creating ${paragraphs.length} embeddings with ollama`);
    const embeddings = await ollama.embed({
        model: env.EMBEDDING_MODEL || "embeddinggemma",
        input: paragraphs,
    });
    console.log(`Created ${embeddings.embeddings.length} embeddings with ollama`);

    // Add the formatted transcript to ElasticSearch
    console.log("Adding data to ElasticSearch");
    for (let i=0; i<embeddings.embeddings.length; i++) {
        try {
            const part = readable_hybrid_transcript_parts[i];
            if (!part) continue;
            const embedding = embeddings.embeddings[i];
            if (!embedding) continue;
            await create_index_paragraph(
                `${recording_id}_${i}`, {
                    ...part,
                    recording_id,
                },
                new Date(Date.parse(recording.created_at)),
                embedding,
            );
        } catch (error) {
            console.error(error);
        }
    }
    console.log("Added data to ElasticSearch");

    // Return the transcript parts and readable transcript.
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
 * Retrieve the speaker timeline data from the participant events artifact's `download_url`.
 */
async function retrieve_speaker_timeline_parts(args: { download_url: string }) {
    const { download_url } = z.object({ download_url: z.string() }).parse(args);

    const response = await fetch(download_url);
    if (!response.ok) throw new Error(await response.text());

    return SpeakerTimelinePartSchema.array().parse(await response.json());
}

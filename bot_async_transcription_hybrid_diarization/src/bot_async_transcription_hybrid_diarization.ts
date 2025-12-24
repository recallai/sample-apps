import fs from "fs";
import path from "path";
import { z } from "zod";
import { env } from "./config/env";
import { RecordingArtifactSchema } from "./schemas/RecordingArtifactSchema";
import { SpeakerTimelinePartSchema, type SpeakerTimelinePartType } from "./schemas/SpeakerTimelinePartSchema";
import { TranscriptArtifactEventSchema, type TranscriptArtifactEventType } from "./schemas/TranscriptArtifactEventSchema";
import { TranscriptArtifactSchema } from "./schemas/TranscriptArtifactSchema";
import { TranscriptPartSchema, type TranscriptPartType } from "./schemas/TranscriptPartSchema";

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
            provider: { deepgram_async: { diarize: true } },
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
    console.log(`Retreived recording: ${recording.id}`);

    if (!recording.media_shortcuts?.transcript?.data?.download_url) {
        throw new Error("Transcript download URL is null");
    }
    if (!recording.media_shortcuts.participant_events?.data?.speaker_timeline_download_url) {
        throw new Error("Speaker timeline download URL is null");
    }

    // Retrieve and format transcript data.
    const transcript_data = await retrieve_transcript_parts({
        download_url: recording.media_shortcuts.transcript.data.download_url,
    });
    console.log(`Retreived ${transcript_data.length} transcript parts`);
    const speaker_timeline_data = await retrieve_speaker_timeline_parts({
        download_url: recording.media_shortcuts.participant_events.data.speaker_timeline_download_url,
    });
    console.log(`Retreived ${speaker_timeline_data.length} speaker timeline parts`);
    const hybrid_transcript_parts = format_hybrid_diarization_transcript({
        transcript_data,
        speaker_timeline_data,
    });
    console.log(`Formatted ${hybrid_transcript_parts.length} hybrid transcript parts`);
    const readable_hybrid_transcript_parts = format_transcript_by_sentences(hybrid_transcript_parts);
    console.log(`Formatted ${readable_hybrid_transcript_parts.length} readable hybrid transcript parts`);

    // Write the hybrid transcript parts data to a file.
    const output_path_events = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/transcript.json`,
    );
    if (!fs.existsSync(output_path_events)) {
        fs.mkdirSync(path.dirname(output_path_events), { recursive: true });
        fs.writeFileSync(output_path_events, "[]", { flag: "w+" });
    }
    fs.writeFileSync(output_path_events, JSON.stringify(hybrid_transcript_parts, null, 2), { flag: "w+" });

    // Write the readable hybrid transcript to a file.
    const output_path_readable = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/readable.txt`,
    );
    if (!fs.existsSync(output_path_readable)) {
        fs.mkdirSync(path.dirname(output_path_readable), { recursive: true });
        fs.writeFileSync(output_path_readable, "", { flag: "w+" });
    }
    fs.writeFileSync(output_path_readable, readable_hybrid_transcript_parts.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n"), { flag: "w+" });

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

/**
 * Retrieve the speaker timeline data from the participant events artifact's `download_url`.
 */
async function retrieve_speaker_timeline_parts(args: { download_url: string }) {
    const { download_url } = z.object({ download_url: z.string() }).parse(args);

    const response = await fetch(download_url);
    if (!response.ok) throw new Error(await response.text());

    return SpeakerTimelinePartSchema.array().parse(await response.json())
}

/**
 * Format the transcript data with hybrid diarization.
 * This will use use machine diarization to get anonymous speaker labels for each participant in the transcript,
 * and will diarize them using speaker-timeline diarization if there's only one machine-diarized participant speaking for that participant.
 * 
 * The end result is a transcript which uses speaker-timeline diarization for each participant unless there are multiple people speaking from the same device.
 */
function format_hybrid_diarization_transcript(args: { transcript_data: TranscriptPartType[], speaker_timeline_data: SpeakerTimelinePartType[] }) {
    const { transcript_data, speaker_timeline_data } = z.object({
        transcript_data: TranscriptPartSchema.array(),
        speaker_timeline_data: SpeakerTimelinePartSchema.array(),
    }).parse(args);

    const ParticipantMappingSchema = z.object({ id: z.number(), name: z.string() });
    let participant_map = new Map<string, string>();

    // Create a mapping of participant names to their IDs.
    for (let i = 0; i < speaker_timeline_data.length; i++) {
        // Get the bounds of the current speaker event
        const speaker_event = speaker_timeline_data[i];
        const speaker_event_start = speaker_event.start_timestamp.relative;
        const speaker_event_end = speaker_event.end_timestamp?.relative ?? Number.POSITIVE_INFINITY;

        // Get the transcript segments that are within the current speaker event
        const transcript_segments = transcript_data.filter((transcript) => {
            const start = transcript.words[0].start_timestamp.relative;
            const end = transcript.words[transcript.words.length - 1]?.end_timestamp?.relative ?? Number.POSITIVE_INFINITY;
            return speaker_event_start <= start && speaker_event_end > end;
        });

        // If there are no transcript segments, skip the current speaker event
        if (transcript_segments.length === 0) continue;

        // For each transcript segment, see if the speaker is the same for each
        const speaker_names = new Set(transcript_segments.map((transcript) => transcript.participant?.name ?? ""));
        if (speaker_names.size === 1) {
            console.log(`Found ${speaker_names.size} speaker names for event ${i}: ${JSON.stringify(Array.from(speaker_names.values()))}`);
            const anon_name = speaker_names.values().next().value;
            const participant_id = speaker_event.participant.id ?? undefined;
            const participant_name = speaker_event.participant.name ?? undefined;
            if (anon_name && participant_id && participant_name) {
                const participant = ParticipantMappingSchema.parse({ name: participant_name, id: participant_id });
                participant_map.set(anon_name, JSON.stringify(participant));
            } else {
                console.error(`No speaker name or id found for event ${JSON.stringify({ anon_name, participant_id, participant_name, participant: speaker_event.participant })}`);
            }
        }
    }

    const participant_mapping = Object.fromEntries(
        Array.from(participant_map.entries())
            .map(
                ([anon_name, participant]) => [
                    anon_name,
                    ParticipantMappingSchema.parse(JSON.parse(participant))
                ]
            )
    );

    console.log(`Participant mapping: ${JSON.stringify(participant_mapping)}`);

    const hybrid_transcript_parts = transcript_data.map((transcript) => {
        const participant_data = participant_mapping[transcript.participant?.name ?? ""];
        if (!participant_data) return transcript;
        return {
            ...transcript,
            participant: {
                ...transcript.participant,
                ...participant_data,
            },
        };
    });

    return hybrid_transcript_parts;
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
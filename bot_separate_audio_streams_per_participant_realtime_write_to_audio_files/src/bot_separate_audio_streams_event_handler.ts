import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { AudioSeparateRawDataEventSchema } from "./schemas/AudioSeparateRawDataEventSchema";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/* Store the open streams so we can reuse them for the same recording and participant. */
const audio_stream_passthroughs_raw = new Map<string, PassThrough>();
const audio_stream_passthroughs_mp3 = new Map<string, PassThrough>();

/* Store the last relative timestamp for each stream_key to fill in silence gaps in audio stream. */
const audio_stream_previous_chunk_ends = new Map<string, number>(); // stream_key -> last relative timestamp

/* Store the pending buffers for each stream_key to batch write them. */
const audio_stream_pending_buffers = new Map<string, Buffer[]>();

/* Number of chunks to buffer before writing to the audio passthrough. */
const WRITE_THRESHOLD = 5;

/* Interval in milliseconds to flush the pending buffers. */
const FLUSH_INTERVAL_MS = 40;

/**
 * Generate a unique key for the audio stream.
 */
function get_stream_key(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    return `${recording_id}-${participant_id}`;
}

/**
 * Get the audio passthrough for a given recording and participant raw audio.
 * If the passthrough does not exist, create it.
 */
function get_audio_passthrough_raw(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    const stream_key = get_stream_key({ recording_id, participant_id });

    if (!audio_stream_passthroughs_raw.has(stream_key)) {
        const output_path = path.join(
            process.cwd(),
            `output/recording-${recording_id}/participant-${participant_id}.raw`,
        );
        fs.mkdirSync(path.dirname(output_path), { recursive: true });

        const passthrough = new PassThrough();
        const write_stream = fs.createWriteStream(output_path, { flags: "a" });
        passthrough.pipe(write_stream);

        audio_stream_passthroughs_raw.set(stream_key, passthrough);
    }

    const passthrough = audio_stream_passthroughs_raw.get(stream_key);
    if (!passthrough) throw new Error(`No audio passthrough found for stream key: ${stream_key}`);
    return passthrough;
}


/**
 * Get the audio passthrough for a given recording and participant mp3 audio.
 * If the passthrough does not exist, create it.
 */
function get_audio_passthrough_mp3(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    const stream_key = get_stream_key({ recording_id, participant_id });

    if (!audio_stream_passthroughs_mp3.has(stream_key)) {
        const output_path = path.join(
            process.cwd(),
            `output/recording-${recording_id}/participant-${participant_id}.mp3`,
        );
        fs.mkdirSync(path.dirname(output_path), { recursive: true });

        const passthrough = new PassThrough();
        ffmpeg()
            .input(passthrough)
            .inputFormat("s16le") // Input format is S16LE (16-bit PCM LE).
            .inputOptions([
                "-ar", "16000", // Audio frequency is 16000 Hz.
                "-ac", "1", // Audio channels is 1.
            ])
            .format("mp3")
            .on("error", (err) => console.error("ffmpeg failed", err))
            .save(output_path);

        audio_stream_passthroughs_mp3.set(stream_key, passthrough);
    }

    const passthrough = audio_stream_passthroughs_mp3.get(stream_key);
    if (!passthrough) throw new Error(`No audio passthrough found for stream key: ${stream_key}`);
    return passthrough;
}

/**
 * Event handler for handling separate-audio-streams event.
 */
export function bot_separate_audio_streams_event_handler(args: { msg: Record<string, any> }) {
    const { msg: json_msg } = args;
    const msg = AudioSeparateRawDataEventSchema.parse(json_msg);

    // Convert base64-encoded raw audio to PCM buffer.
    const pcm_buffer_chunk = Buffer.from(msg.data.data.buffer, "base64");

    // Track each participant audio stream's previous chunk end so we only pad the actual silence since the last chunk.
    const stream_key = get_stream_key({ recording_id: msg.data.recording.id, participant_id: msg.data.data.participant.id });
    const chunk_duration = (pcm_buffer_chunk.length / 2) / 16000; // 2 bytes per sample @ 16000 samples per second.
    const current_chunk_start = msg.data.data.timestamp.relative;
    const current_chunk_end = current_chunk_start + chunk_duration;

    // If there is a previous chunk end, calculate the gap and pad the silence if needed.
    const previous_chunk_end = audio_stream_previous_chunk_ends.get(stream_key);
    // Input is base64-encoded raw audio of the original buffer + silence (if needed).
    let padded_buffer = pcm_buffer_chunk;
    if (previous_chunk_end !== undefined) {
        const gap = current_chunk_start - previous_chunk_end;
        if (gap > 0) {
            const silence_samples = Math.round(gap * 16000);
            const silence_buffer = Buffer.alloc(silence_samples * 2);
            padded_buffer = Buffer.concat([silence_buffer, pcm_buffer_chunk]);
        }
    }
    audio_stream_previous_chunk_ends.set(stream_key, current_chunk_end);

    console.log(`Writing to ${stream_key} with size ${padded_buffer.length} bytes. relative=${msg.data.data.timestamp.relative}, absolute=${msg.data.data.timestamp.absolute}`);

    // Write the raw audio to a file.
    const passthrough_raw = get_audio_passthrough_raw({
        recording_id: msg.data.recording.id,
        participant_id: msg.data.data.participant.id,
    });
    passthrough_raw.write(padded_buffer);

    // Write the raw audio to an MP3 file.
    const passthrough_mp3 = get_audio_passthrough_mp3({
        recording_id: msg.data.recording.id,
        participant_id: msg.data.data.participant.id,
    });

    // Store the raw audio buffers in the pending buffers to batch write them over a certain threshold
    // This is required because the mp3 encoder will produce choppiness/clicking noise if the buffers are flushed in small chunks.
    // This only applies to the MP3 passthrough since the raw audio is written directly to a file.
    const buffers = audio_stream_pending_buffers.get(stream_key) ?? [];
    buffers.push(padded_buffer);
    audio_stream_pending_buffers.set(stream_key, buffers);
    if (buffers.length >= WRITE_THRESHOLD) {
        passthrough_mp3.write(Buffer.concat(buffers));
        audio_stream_pending_buffers.set(stream_key, []);
    } else {
        setTimeout(() => {
            const buffered = audio_stream_pending_buffers.get(stream_key);
            if (!buffered?.length) return;
            passthrough_mp3.write(Buffer.concat(buffered));
            audio_stream_pending_buffers.set(stream_key, []);
        }, FLUSH_INTERVAL_MS);
    }
}

/**
 * Event handler for closing the audio passthrough and cleanup.
 */
export function close_audio_streams_event_handler(args: { recording_id: string }) {
    const { recording_id } = args;
    audio_stream_passthroughs_raw.forEach((passthrough, stream_key) => {
        if (stream_key.includes(recording_id)) {
            passthrough.end();
            audio_stream_passthroughs_raw.delete(stream_key);
        }
    });
    audio_stream_passthroughs_mp3.forEach((passthrough, stream_key) => {
        if (stream_key.includes(recording_id)) {
            passthrough.end();
            audio_stream_passthroughs_mp3.delete(stream_key);
        }
    });
    audio_stream_pending_buffers.forEach((_, key) => {
        if (key.includes(recording_id)) {
            audio_stream_pending_buffers.delete(key);
        }
    });
    audio_stream_previous_chunk_ends.forEach((_, key) => {
        if (key.includes(recording_id)) {
            audio_stream_previous_chunk_ends.delete(key);
        }
    });
}
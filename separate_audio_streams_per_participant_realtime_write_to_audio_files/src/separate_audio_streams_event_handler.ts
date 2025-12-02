import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { AudioSeparateRawDataSchema } from "./schemas/AudioSeparateRawDataSchema";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * A stream pipeline is a pipeline that takes in a raw audio stream and outputs an MP3 file.
 * It is used to store the open pipelines so we can reuse them for the same recording and participant.
 */
type AudioStreamPipeline = {
    passthrough: PassThrough;
    ffmpeg_command: ReturnType<typeof ffmpeg>;
    write_stream: fs.WriteStream;
};

/* Store the open pipelines so we can reuse them for the same recording and participant. */
const audio_stream_pipelines = new Map<string, AudioStreamPipeline>(); // stream_key -> pipeline

/* Store the last relative timestamp for each stream_key to fill in silence gaps in audio stream. */
const audio_stream_previous_chunk_ends = new Map<string, number>(); // stream_key -> last relative timestamp

/* Store the pending buffers for each stream_key to batch write them. */
const audio_stream_pending_buffers = new Map<string, Buffer[]>();

/* Number of chunks to buffer before writing to the audio pipeline. */
const WRITE_THRESHOLD = 5;

/* Interval in milliseconds to flush the pending buffers. */
const FLUSH_INTERVAL_MS = 40;

/**
 * Schedule a flush of the pending buffers.
 * This will run if the FLUSH_INTERVAL_MS has passed and the number of chunks received is less than the write threshold,
 * to ensure we don't miss any chunks.
 */
const schedule_flush = (stream_key: string, pipeline: AudioStreamPipeline) => {
    setTimeout(() => {
        const buffered = audio_stream_pending_buffers.get(stream_key);
        if (!buffered?.length) return;
        pipeline.passthrough.write(Buffer.concat(buffered));
        audio_stream_pending_buffers.set(stream_key, []);
    }, FLUSH_INTERVAL_MS);
};

/**
 * Generate a unique key for the audio stream.
 */
function get_stream_key(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    return `${recording_id}-${participant_id}`;
}

/**
 * Get the audio pipeline for a given recording and participant.
 * If the pipeline does not exist, create it.
 */
function get_audio_pipeline(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    const stream_key = get_stream_key({ recording_id, participant_id });

    if (!audio_stream_pipelines.has(stream_key)) {
        const output_path = path.join(
            process.cwd(),
            `output/recording-${recording_id}/participant-${participant_id}.mp3`,
        );
        fs.mkdirSync(path.dirname(output_path), { recursive: true });

        const passthrough = new PassThrough();
        const write_stream = fs.createWriteStream(output_path, { flags: "a" });
        const command = ffmpeg()
            .input(passthrough)
            .inputFormat("s16le") // Input format is S16LE (16-bit PCM LE).
            .inputOptions([
                "-ar", "16000", // Audio frequency is 16000 Hz.
                "-ac", "1", // Audio channels is 1.
            ])
            .format("mp3")
            .on("error", (err) => console.error("ffmpeg failed", err));

        command.pipe(write_stream, { end: false });

        audio_stream_pipelines.set(stream_key, {
            passthrough,
            ffmpeg_command: command,
            write_stream,
        });
    }

    const pipeline = audio_stream_pipelines.get(stream_key);
    if (!pipeline) throw new Error(`No audio pipeline found for stream key: ${stream_key}`);
    return pipeline;
}

/**
 * Event handler for handling separate-audio-streams event.
 */
export function separate_audio_streams_event_handler(args: { msg: Record<string, any> }) {
    const { msg: json_msg } = args;
    const msg = AudioSeparateRawDataSchema.parse(json_msg);

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

    // Get the audio pipeline for the stream.
    console.log(`Writing to ${stream_key} with size ${padded_buffer.length} bytes`);
    const pipeline = get_audio_pipeline({
        recording_id: msg.data.recording.id,
        participant_id: msg.data.data.participant.id,
    });

    // Choppiness/clicking noise can occur if the buffers are flushed in small chunks so we batch them up to a write threshold.
    const buffers = audio_stream_pending_buffers.get(stream_key) ?? [];
    buffers.push(padded_buffer);
    audio_stream_pending_buffers.set(stream_key, buffers);

    // If the number of buffers is greater than the write threshold, flush them.
    if (buffers.length >= WRITE_THRESHOLD) {
        pipeline.passthrough.write(Buffer.concat(buffers));
        audio_stream_pending_buffers.set(stream_key, []);
    } else {
        schedule_flush(stream_key, pipeline);
    }
}

/**
 * Event handler for closing the audio pipeline and cleanup.
 */
export function close_audio_streams_event_handler(args: { recording_id: string }) {
    const { recording_id } = args;
    audio_stream_pipelines.forEach((pipeline, stream_key) => {
        if (stream_key.includes(recording_id)) {
            pipeline.passthrough.end();
            pipeline.write_stream.end();
            audio_stream_pipelines.delete(stream_key);
        }
    });
    audio_stream_previous_chunk_ends.forEach((_, key) => {
        if (key.includes(recording_id)) {
            audio_stream_previous_chunk_ends.delete(key);
        }
    });
}
import { z } from "zod";
import path from "path";
import fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Schema for the audio_separate_raw.data event
 */
const AudioSeparateRawDataSchema = z.object({
    "event": z.literal("audio_separate_raw.data"),
    "data": z.object({
        "data": z.object({
            "buffer": z.string(), // base64-encoded raw audio 16 kHz mono, S16LE(16-bit PCM LE)
            "timestamp": z.object({ // Timestamp of the first byte in the buffer. More info about timestamps: https://docs.recall.ai/docs/download-schemas#/schema-timestamps
                "relative": z.number(), // "Timestamp in seconds"),
                "absolute": z.string(), // "ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)")
            }),
            "participant": z.object({
                "id": z.number(), // Recall.ai assigned participant id (e.g. 100, 200, 300)
                "name": z.string().nullable(), // Display name from meeting
                "is_host": z.boolean(), // True if the participant is the host
                "platform": z.string().nullable(), // Meeting platform constant. values: 'desktop', 'dial-in', 'unknown'
                "extra_data": z.any(), // Extra data about the participant from the meeting platform
                "email": z.string().nullish(), // Email address of the participant if using Recall's calendar integration
            })
        }),
        "realtime_endpoint": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "audio_separate": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "recording": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "bot": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }).nullish(),
    })
});

/**
 * A stream pipeline is a pipeline that takes in a raw audio stream and outputs an MP3 file.
 * It is used to store the open pipelines so we can reuse them for the same recording and participant.
 * This prevents restarting ffmpeg for every chunk, removing clicking noise in the audio.
 */
type StreamPipeline = {
    passthrough: PassThrough;
    ffmpegCommand: ReturnType<typeof ffmpeg>;
    writeStream: fs.WriteStream;
};

/* Store the open pipelines so we can reuse them for the same recording and participant. */
const AudioStreamPipelines = new Map<string, StreamPipeline>(); // streamKey -> pipeline
/* Store the last relative timestamp for each streamKey to fill in silence gaps in audio stream */
const AudioStreamPreviousChunkEnds = new Map<string, number>(); // streamKey -> last relative timestamp
/* Store the pending buffers for each streamKey to batch write them */
const AudioStreamPendingBuffers = new Map<string, Buffer[]>();
/* Number of chunks to buffer before writing to the audio pipeline */
const WRITE_THRESHOLD = 5;
/* Interval in milliseconds to flush the pending buffers */
const FLUSH_INTERVAL_MS = 40;

/**
 * Schedule a flush of the pending buffers
 * This will run if the FLUSH_INTERVAL_MS has passed and the number of chunks received is less than the write threshold,
 * to ensure we don't miss any chunks.
 */
const scheduleFlush = (streamKey: string, pipeline: StreamPipeline) => {
    setTimeout(() => {
        const buffered = AudioStreamPendingBuffers.get(streamKey);
        if (!buffered?.length) return;
        pipeline.passthrough.write(Buffer.concat(buffered));
        AudioStreamPendingBuffers.set(streamKey, []);
    }, FLUSH_INTERVAL_MS);
};

/**
 * Generate a unique key for the audio stream
 */
const getStreamKey = (args: { recordingId: string, participantId: number }) => {
    const { recordingId, participantId } = args;
    return `${recordingId}-${participantId}`;
}

/**
 * Get the audio pipeline for a given recording and participant.
 * If the pipeline does not exist, create it.
 */
const getAudioPipeline = (args: { recordingId: string, participantId: number }) => {
    const { recordingId, participantId } = args;
    const streamKey = getStreamKey({ recordingId, participantId });

    if (!AudioStreamPipelines.has(streamKey)) {
        const outputPath = path.join(
            process.cwd(),
            `output/recording-${recordingId}/participant-${participantId}.mp3`
        );
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        const passthrough = new PassThrough();
        const writeStream = fs.createWriteStream(outputPath, { flags: "a" });
        const command = ffmpeg()
            .input(passthrough)
            // Input format is S16LE(16-bit PCM LE)
            .inputFormat("s16le")
            .inputOptions([
                "-ar", "16000", // Audio frequency is 16000 Hz
                "-ac", "1" // Audio channels is 1
            ])
            .format("mp3")
            .on("error", err => console.error("ffmpeg failed", err));

        command.pipe(writeStream, { end: false });

        AudioStreamPipelines.set(streamKey, {
            passthrough,
            ffmpegCommand: command,
            writeStream,
        });
    }

    return AudioStreamPipelines.get(streamKey)!;
}

/**
 * Event handler for handling separate-audio-streams event
 */
export const separateAudioStreamsEventHandler = (args: { msg: Record<string, any> }) => {
    const { msg: jsonMsg } = args;
    const msg = AudioSeparateRawDataSchema.parse(jsonMsg);

    // Convert base64-encoded raw audio to PCM buffer
    const pcmBufferChunk = Buffer.from(msg.data.data.buffer, "base64");

    // Track each participant audio stream's previous chunk end so we only pad the actual silence since the last chunk.
    const streamKey = getStreamKey({ recordingId: msg.data.recording.id, participantId: msg.data.data.participant.id });
    const chunkDuration = (pcmBufferChunk.length / 2) / 16000; // 2 bytes per sample @ 16000 samples per second
    const currentChunkStart = msg.data.data.timestamp.relative;
    const currentChunkEnd = currentChunkStart + chunkDuration;

    // If there is a previous chunk end, calculate the gap and pad the silence if needed.
    const previousChunkEnd = AudioStreamPreviousChunkEnds.get(streamKey);
    // Input is base64-encoded raw audio of the original buffer + silence (if needed)
    let paddedBuffer = pcmBufferChunk;
    if (previousChunkEnd !== undefined) {
        const gap = currentChunkStart - previousChunkEnd;
        if (gap > 0) {
            const silenceSamples = Math.round(gap * 16000);
            const silenceBuffer = Buffer.alloc(silenceSamples * 2);
            paddedBuffer = Buffer.concat([silenceBuffer, pcmBufferChunk]);
        }
    }
    AudioStreamPreviousChunkEnds.set(streamKey, currentChunkEnd);

    // Get the audio pipeline for the stream
    console.log(`Writing to ${streamKey} with size ${paddedBuffer.length} bytes`);
    const pipeline = getAudioPipeline({
        recordingId: msg.data.recording.id,
        participantId: msg.data.data.participant.id
    });

    // Choppiness/clicking noise can occur if the buffers are flushed in small chunks so we batch them up to a write threshold.
    // This is to prevent the audio pipeline from being overwhelmed with small chunks.
    const buffers = AudioStreamPendingBuffers.get(streamKey) ?? [];
    buffers.push(paddedBuffer);
    AudioStreamPendingBuffers.set(streamKey, buffers);

    // If the number of buffers is greater than the write threshold, flush them.
    if (buffers.length >= WRITE_THRESHOLD) {
        pipeline.passthrough.write(Buffer.concat(buffers));
        AudioStreamPendingBuffers.set(streamKey, []);
    } else {
        scheduleFlush(streamKey, pipeline);
    }
}

/**
 * Event handler for closing the audio pipeline and cleanup
 */
export const closeAudioStreamsEventHandler = (args: { recordingId: string }) => {
    const { recordingId } = args;
    AudioStreamPipelines.forEach((pipeline, streamKey) => {
        if (streamKey.includes(recordingId)) {
            pipeline.passthrough.end();
            pipeline.writeStream.end();
            AudioStreamPipelines.delete(streamKey);
        }
    });
    AudioStreamPreviousChunkEnds.forEach((_, key) => {
        if (key.includes(recordingId)) {
            AudioStreamPreviousChunkEnds.delete(key);
        }
    });
}
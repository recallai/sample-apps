import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { PNG } from "pngjs";
import { VideoSeparatePngDataEventSchema } from "./schemas/VideoSeparatePngDataEventSchema";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/* Store the open passthroughs so we can reuse them for the same recording and participant. */
const png_video_stream_passthroughs = new Map<string, PassThrough>(); // stream_key -> passthrough

/* Store the last relative timestamp for each stream_key to fill in silence gaps in png video stream. */
const png_video_stream_previous_chunk_ends = new Map<string, number>(); // stream_key -> last relative timestamp

/* PNG video stream constants. */
const PNG_FRAME_RATE = 2; // 2 fps
const PNG_FRAME_DURATION = 1 / PNG_FRAME_RATE;

/* Black frame constants. */
const BLACK_FRAME_DIMENSIONS = { width: 640, height: 360 };
const BLACK_FRAME_PNG = create_black_frame_png(BLACK_FRAME_DIMENSIONS);
function create_black_frame_png(args: { width: number, height: number }) {
    const { width, height } = args;
    const png = new PNG({ width, height });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) {
        png.data[i] = 255;
    }
    return PNG.sync.write(png);
}

/* Save a single png frame to a file. */
const save_png_to_file = (args: { recording_id: string, participant_id: number, relative_timestamp: number, png: Buffer }) => {
    const { recording_id, participant_id, relative_timestamp, png } = args;
    const output_path = path.join(
        process.cwd(),
        `output/recording-${recording_id}/participant-${participant_id}-snapshots/frame-${relative_timestamp}s.png`,
    );
    fs.mkdirSync(path.dirname(output_path), { recursive: true });
    fs.writeFileSync(output_path, png);
};

/**
 * Generate a unique key for the png video stream.
 */
function get_stream_key(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    return `${recording_id}-${participant_id}`;
}

/**
 * Get the png video passthrough for a given recording and participant.
 * If the passthrough does not exist, create it.
 */
function get_png_video_passthrough(args: { recording_id: string, participant_id: number }) {
    const { recording_id, participant_id } = args;
    const stream_key = get_stream_key({ recording_id, participant_id });

    if (!png_video_stream_passthroughs.has(stream_key)) {
        const output_path = path.join(
            process.cwd(),
            `output/recording-${recording_id}/participant-${participant_id}.mp4`,
        );
        fs.mkdirSync(path.dirname(output_path), { recursive: true });

        const passthrough = new PassThrough();
        ffmpeg()
            .input(passthrough)
            .inputFormat("image2pipe") // Input format is image2pipe.
            .inputOptions([
                "-framerate", "2", // PngVideo frame rate is 2 fps.
            ])
            .videoCodec("libx264") // Video codec is libx264.
            .format("mp4")
            .outputOptions([
                "-pix_fmt", "yuv420p", // Pixel format is yuv420p.
            ])
            .on("error", (err) => console.error("ffmpeg failed", err))
            .save(output_path);


        png_video_stream_passthroughs.set(stream_key, passthrough);
    }

    const passthrough = png_video_stream_passthroughs.get(stream_key);
    if (!passthrough) throw new Error(`No png video passthrough found for stream key: ${stream_key}`);
    return passthrough;
}

/**
 * Event handler for handling separate-png-video-streams event.
 */
export function bot_separate_png_video_streams_event_handler(args: { msg: Record<string, any> }) {
    const { msg: json_msg } = args;
    const msg = VideoSeparatePngDataEventSchema.parse(json_msg);
    const png_buffer = Buffer.from(msg.data.data.buffer, "base64");

    // Save the png frame to a file.
    save_png_to_file({
        recording_id: msg.data.recording.id,
        participant_id: msg.data.data.participant.id,
        relative_timestamp: msg.data.data.timestamp.relative,
        png: png_buffer,
    });

    // Track each participant png video stream's previous chunk end so we only pad the actual blank video frames since the last chunk.
    const stream_key = get_stream_key({ recording_id: msg.data.recording.id, participant_id: msg.data.data.participant.id });
    const chunk_duration = PNG_FRAME_DURATION;
    const current_chunk_start = msg.data.data.timestamp.relative;
    const current_chunk_end = current_chunk_start + chunk_duration;

    // Input is base64-encoded png buffer + blank video frames (if needed).
    let padded_buffer = png_buffer;
    const previous_chunk_end = png_video_stream_previous_chunk_ends.get(stream_key);

    const gap = current_chunk_start - (previous_chunk_end ?? 0);

    // Sometimes we'll receive multiple of the same chunks or chunks we've already processed in a row.
    // We can skip these since they don't add any new information, otherwise they'll cause the video to freeze.
    if (gap < 0) return;

    // Calculate the number of blank video frames to add.
    const frames_to_pad = Math.floor((Math.max(gap, 0)) / chunk_duration);
    if (frames_to_pad > 0) {
        const padding_buffers = new Array(frames_to_pad).fill(BLACK_FRAME_PNG);
        padded_buffer = Buffer.concat([...padding_buffers, png_buffer]);
    }
    png_video_stream_previous_chunk_ends.set(stream_key, Math.max(previous_chunk_end ?? 0, current_chunk_end));

    // Get the png video passthrough for the stream.
    console.log(`Writing to ${stream_key} with size ${msg.data.data.buffer.length} bytes`);
    const passthrough = get_png_video_passthrough({
        recording_id: msg.data.recording.id,
        participant_id: msg.data.data.participant.id,
    });

    passthrough.write(padded_buffer);
}

/**
 * Event handler for closing the png video passthrough and cleanup.
 */
export function close_png_video_streams_event_handler(args: { recording_id: string }) {
    const { recording_id } = args;
    png_video_stream_passthroughs.forEach((passthrough, stream_key) => {
        if (stream_key.includes(recording_id)) {
            passthrough.end();
            png_video_stream_passthroughs.delete(stream_key);
        }
    });
}
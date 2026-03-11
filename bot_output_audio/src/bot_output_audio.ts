import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import isBase64 from "is-base64";
import { z } from "zod";
import { env } from "./config/env";

/**
 * Create a bot that outputs audio using base64-encoded MP3 data.
 */
export async function bot_output_audio() {
    const base64_dir = resolve("src", "base64");
    const BASE64_IN_CALL_RECORDING = await import_base64({ path_to_file: resolve(base64_dir, "in_call_recording.txt") });

    if (!BASE64_IN_CALL_RECORDING) {
        throw new Error("No base64 data found.");
    }

    const body: Record<string, any> = {
        meeting_url: env.MEETING_URL,
        recording_config: {
            start_recording_on: "participant_join",
        },
    };
    if (BASE64_IN_CALL_RECORDING) {
        if (!body.automatic_audio_output) {
            body.automatic_audio_output = {};
        }
        body.automatic_audio_output.in_call_recording = {
            data: {
                kind: "mp3",
                b64_data: BASE64_IN_CALL_RECORDING,
            },
        };
    }

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/bot`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Failed to create bot output audio: ${await response.text()}`);
    }

    const bot = await response.json();
    console.log(`Created bot: ${JSON.stringify(bot)}`);
    return bot;
}

/**
 * Validate base64 data is a valid MP3.
 * Throws if base64 data isn't valid.
 */
async function validate_base64_mp3(args: { base64: string }) {
    const { base64 } = z.object({ base64: z.string() }).parse(args);

    const buffer = Buffer.from(base64, "base64");

    if (!isBase64(base64, { allowMime: false })) {
        throw new Error("Base64 data is not valid.");
    }
    if (buffer.length === 0) {
        throw new Error("Base64 data is empty.");
    }
    const type = await fileTypeFromBuffer(buffer);
    if (type?.mime !== "audio/mpeg") {
        throw new Error(`Base64 data is not an MP3. Received '${type?.mime}'.`);
    }
}

/**
 * Import the base64 MP3 audio.
 * Throws if base64 data isn't valid.
 */
async function import_base64(args: { path_to_file: string }) {
    const { path_to_file } = z.object({ path_to_file: z.string() }).parse(args);
    const base64 = readFileSync(path_to_file, "utf8").trim();
    try {
        await validate_base64_mp3({ base64 });
        return base64;
    } catch (error) {
        throw new Error(`Failed to import base64: ${error instanceof Error ? error.message : String(error)} Path: ${args.path_to_file}`);
    }
}

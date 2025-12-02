import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import isBase64 from "is-base64";
import { z } from "zod";
import { env } from "./config/env";

/**
 * Validate base64 data is valid.
 * Throws if base64 data isn't valid.
 */
async function validate_base64_jpeg(args: { base64: string }) {
    const { base64 } = z.object({ base64: z.string() }).parse(args);

    const buffer = Buffer.from(base64, "base64");

    // Validate data is valid base64.
    if (!isBase64(base64, { allowMime: false })) {
        throw new Error("Base64 data is not valid.");
    }
    // Validate data is not empty.
    if (buffer.length === 0) {
        throw new Error("Base64 data is empty.");
    }
    // Validate length is not too large.
    if (buffer.length > 1_835_008) {
        throw new Error(`Base64 data is too large. Max size is 1,835,008 bytes. Received ${buffer.length} bytes.`);
    }
    // Validate type is valid jpeg.
    const type = await fileTypeFromBuffer(buffer);
    if (type?.mime !== "image/jpeg") {
        throw new Error(`Base64 data is not a JPEG. Received '${type?.mime}'.`);
    }
}

/**
 * Import the base64 JPEG image.
 * Throws if base64 data isn't valid.
 */
async function import_base64(args: { path_to_file: string }) {
    const { path_to_file } = z.object({ path_to_file: z.string() }).parse(args);
    const base64 = readFileSync(path_to_file, "utf8").trim();
    try {
        await validate_base64_jpeg({ base64 });
        return base64;
    } catch (error) {
        throw new Error(`Failed to import base64: ${error instanceof Error ? error.message : String(error)} Path: ${args.path_to_file}`);
    }
}

/**
 * Create a bot output image using the base64-encoded JPEG data.
 */
export async function create_bot_output_image() {
    const base64_dir = resolve("src", "base64");
    const BASE64_IN_CALL_NOT_RECORDING = await import_base64({ path_to_file: resolve(base64_dir, "in_call_not_recording.txt") });
    const BASE64_IN_CALL_RECORDING = await import_base64({ path_to_file: resolve(base64_dir, "in_call_recording.txt") });

    const response = await fetch(`https://${env.RECALL_REGION}.recall.ai/api/v1/bot`, {
        method: "POST",
        headers: {
            "Authorization": `${env.RECALL_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "meeting_url": env.MEETING_URL,
            "automatic_video_output": {
                "in_call_not_recording": {
                    "kind": "jpeg",
                    "b64_data": BASE64_IN_CALL_NOT_RECORDING,
                },
                "in_call_recording": {
                    "kind": "jpeg",
                    "b64_data": BASE64_IN_CALL_RECORDING,
                },
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create bot output image: ${await response.text()}`);
    }


    const bot = await response.json();
    console.log(`Created bot: ${JSON.stringify(bot)}`);
    return bot;
}
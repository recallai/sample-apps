import { z } from "zod";

/**
 * Schema for the audio_mixed_raw.data event
 */
export const AudioMixedRawDataEventSchema = z.object({
    "event": z.literal("audio_mixed_raw.data"),
    "data": z.object({
        "data": z.object({
            "buffer": z.string(), // base64-encoded raw audio 16 kHz mono, S16LE(16-bit PCM LE)
            "timestamp": z.object({ // Timestamp of the first byte in the buffer. More info about timestamps: https://docs.recall.ai/docs/download-schemas#/schema-timestamps
                "relative": z.number(), // "Timestamp in seconds"),
                "absolute": z.string(), // "ISO 8601 absolute timestamp (e.g. 2025-01-01 00:00:00)")
            }),
        }),
        "realtime_endpoint": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "audio_mixed": z.object({
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
    }),
});

import { z } from "zod";

/**
 * Schema for the video_separate_png.data event
 */
export const VideoSeparatePngDataSchema = z.object({
    "event": z.literal("video_separate_png.data"),
    "data": z.object({
        "data": z.object({
            "buffer": z.string(), // base64 encoded png at 2fps with resolution 360x640
            "type": z.enum(["webcam", "screenshare"]), // Type of video stream (webcam or screenshare)
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
            }),
        }),
        "realtime_endpoint": z.object({
            "id": z.string(),
            "metadata": z.record(z.string(), z.string()),
        }),
        "video_separate": z.object({
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

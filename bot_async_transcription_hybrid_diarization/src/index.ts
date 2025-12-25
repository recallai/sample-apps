import http from "http";
import z from "zod";
import { create_async_transcript, bot_async_transcription } from "./bot_async_transcription_hybrid_diarization";
import { env } from "./config/env";
import { RecordingArtifactEventSchema } from "./schemas/RecordingArtifactEventSchema";
import { TranscriptArtifactEventSchema } from "./schemas/TranscriptArtifactEventSchema";

const server = http.createServer();

/**
 * HTTP server for handling HTTP requests.
 */
server.on("request", async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.writeHead(405, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
        }

        // Parse the request body.
        const body_chunks: Buffer[] = [];
        for await (const chunk of req) {
            body_chunks.push(chunk);
        }
        const raw_body = Buffer.concat(body_chunks).toString("utf-8");
        const body = JSON.parse(raw_body);

        // Validate the request body.
        const result = z.discriminatedUnion("event", [
            RecordingArtifactEventSchema,
            TranscriptArtifactEventSchema,
        ]).safeParse(body);
        if (!result.success) {
            console.log(`[Recording=${body?.data?.recording?.id ?? "N/A"}] Received unhandled webhook event: ${JSON.stringify(body)}`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
            return;
        }
        const { data: msg } = result;
        console.log(`[Recording=${msg.data.recording.id}] Received webhook event: ${JSON.stringify(result)}`);

        // Handle the webhook event.
        switch (msg.event) {
            case "recording.done": {
                await create_async_transcript({ recording_id: msg.data.recording.id });
                console.log(`[Recording=${msg.data.recording.id}] Created async transcript for recording`);
                break;
            }
            case "transcript.done": {
                await bot_async_transcription({ msg: body });
                console.log(`[Recording=${msg.data.recording.id}] Saved async transcript to output files`);
                break;
            }
            default: {
                console.log(`[Recording=${msg.data.recording.id}] Received recording artifact event: ${msg.event}`);
            }
        }
    } catch (error) {
        console.error(`Error handling webhook event: ${req.method} ${req.url}`, error);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
});

server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

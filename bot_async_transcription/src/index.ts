import http from "http";
import { create_async_transcript, bot_async_transcription } from "./bot_async_transcription";
import { env } from "./config/env";
import { RecordingArtifactEventSchema } from "./schemas/RecordingArtifactEventSchema";
import { TranscriptArtifactEventSchema } from "./schemas/TranscriptArtifactEventSchema";
import z from "zod";

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


        const body_chunks: Buffer[] = [];
        for await (const chunk of req) {
            body_chunks.push(chunk);
        }
        const raw_body = Buffer.concat(body_chunks).toString("utf-8");
        const body = JSON.parse(raw_body);

        const result = z.discriminatedUnion("event", [
            RecordingArtifactEventSchema,
            TranscriptArtifactEventSchema,
        ]).safeParse(body);
        if (!result.success) {
            console.log(`Received unhandled webhook event: ${JSON.stringify({ msg: body, error: result.error.message })}`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
            return;
        }
        console.log(`Received webhook event: ${JSON.stringify(result)}`);
        const { data: msg } = result;

        switch (msg.event) {
            case "recording.done": {
                await create_async_transcript({ recording_id: msg.data.recording.id });
                break;
            }
            case "transcript.done": {
                await bot_async_transcription({ msg: body });
                break;
            }
            default: {
                console.log(`Received recording artifact event: ${msg.event}`);
            }
        }
    } catch (error) {
        console.error(`Error handling bot real-time transcription utterance: ${req.method} ${req.url}`, error);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
});

server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

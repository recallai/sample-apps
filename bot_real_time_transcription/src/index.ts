import http from "http";
import z from "zod";
import { bot_real_time_transcription } from "./bot_real_time_transcription";
import { env } from "./config/env";
import { TranscriptDataEventSchema } from "./schemas/TranscriptDataEventSchema";

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
            TranscriptDataEventSchema,
        ]).safeParse(body);
        if (!result.success) {
            console.log(`[Recording=${body?.data?.recording?.id ?? "N/A"}] Received unhandled webhook event: ${JSON.stringify(body)}`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
            return;
        }
        const { data: msg } = result;
        console.log(`[Recording=${msg.data.recording.id}] Received webhook event: ${JSON.stringify(result)}`);

        await bot_real_time_transcription({ msg });
    } catch (error) {
        console.error(`Error handling bot real-time transcription utterance: ${req.method} ${req.url}`, error);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
});

server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

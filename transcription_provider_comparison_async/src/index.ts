import http from "http";
import z from "zod";
import { env } from "./config/env";
import { PROVIDER_CONFIGS, get_provider_name } from "./config/providers";
import { RecordingArtifactEventSchema } from "./schemas/RecordingArtifactEventSchema";
import { TranscriptArtifactEventSchema } from "./schemas/TranscriptArtifactEventSchema";
import { create_async_transcripts_for_all_providers, save_provider_transcript } from "./transcription_provider_comparison_async";

const server = http.createServer();

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
            console.log(`[Recording=${body?.data?.recording?.id ?? "N/A"}] Received unhandled webhook event: ${body?.event}`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
            return;
        }

        const { data: msg } = result;
        console.log(`[Recording=${msg.data.recording.id}] Received webhook event: ${msg.event}`);

        switch (msg.event) {
            case "recording.done": {
                await create_async_transcripts_for_all_providers({ recording_id: msg.data.recording.id });
                break;
            }
            case "transcript.done": {
                const { provider_name } = await save_provider_transcript({ msg: body });
                console.log(`[Recording=${msg.data.recording.id}] Saved ${provider_name} transcript to output files`);
                break;
            }
            case "transcript.failed": {
                console.error(`[Recording=${msg.data.recording.id}] Transcript failed: ${msg.data.data.sub_code}`);
                break;
            }
            default: {
                console.log(`[Recording=${msg.data.recording.id}] Received event: ${msg.event}`);
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
    console.log(`Configured providers: ${PROVIDER_CONFIGS.map(get_provider_name).join(", ")}`);
});

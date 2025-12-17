import http from "http";
import { bot_real_time_transcription } from "./bot_real_time_transcription";
import { env } from "./config/env";

const server = http.createServer();


/**
 * HTTP server for handling HTTP requests.
 */
server.on("request", async (req, res) => {
    try {
        const body_chunks: Buffer[] = [];
        for await (const chunk of req) {
            body_chunks.push(chunk);
        }
        const raw_body = Buffer.concat(body_chunks).toString("utf-8");
        const body = JSON.parse(raw_body);
        await bot_real_time_transcription({ msg: body });
    } catch (error) {
        console.error(`Error handling bot real-time transcription utterance: ${req.method} ${req.url}`, error);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
});

server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

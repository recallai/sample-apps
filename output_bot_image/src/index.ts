import http from "http";
import { env } from "./config/env";
import { create_bot_output_image } from "./create_bot_output_image";

const server = http.createServer();

/**
 * HTTP server for handling HTTP requests from Recall.ai
 */
server.on("request", async (req, res) => {
    try {
        const bot = await create_bot_output_image();

        console.log(`HTTP created bot with image: ${req.method} ${req.url}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(bot));
    } catch (error) {
        console.error(`Error creating bot output image: ${req.method} ${req.url}`, error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
});

/**
 * Start the server
 */
server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

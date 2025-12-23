import http from "http";
import { bot_output_image } from "./bot_output_image";
import { env } from "./config/env";

const server = http.createServer();

/**
 * HTTP server for handling HTTP requests.
 */
server.on("request", async (req, res) => {
    try {
        const bot = await bot_output_image();

        console.log(`Created bot: ${req.method} ${req.url}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(bot));
    } catch (error) {
        console.error(`Error creating bot: ${req.method} ${req.url}`, error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
});

/**
 * Start the server.
 */
server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

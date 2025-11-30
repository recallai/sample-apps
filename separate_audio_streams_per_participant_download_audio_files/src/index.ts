import http from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { env } from "./config/env";
import { separate_audio_streams_event_handler, close_audio_streams_event_handler } from "./separate_audio_streams_event_handler";

const server = http.createServer();

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (socket: WebSocket & { recording_id: string }) => {
    socket.on("message", (raw_msg) => {
        let msg: Record<string, any> | undefined;
        try {
            msg = JSON.parse(raw_msg.toString());
        } catch (error) { }
        if (!msg) {
            return;
        }

        // Set the recording id for the socket.
        // This is needed to close the audio pipeline when the socket is closed.
        if (!msg.data.recording?.id) {
            console.log("No recording id found in message");
            return;
        } else if (!socket.recording_id) {
            console.log(`Recording id: ${msg.data.recording.id}`);
            socket.recording_id = msg.data.recording.id;
        }

        // Handle the audio stream event.
        separate_audio_streams_event_handler({ msg });
    });

    socket.on("close", () => {
        close_audio_streams_event_handler({ recording_id: socket.recording_id });
    });
});

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});

server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.PORT}`);
});

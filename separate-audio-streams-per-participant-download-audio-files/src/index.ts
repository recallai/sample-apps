import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { separateAudioStreamsEventHandler, closeAudioStreamsEventHandler } from "./separate-audio-streams-event-handler";
import { env } from "./config/env";

const server = http.createServer();

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (socket: WebSocket & { recordingId: string }) => {
    socket.on("message", rawMsg => {
        let msg: Record<string, any> | undefined;
        try {
            msg = JSON.parse(rawMsg.toString());
        } catch (error) { }
        if (!msg) {
            return;
        }

        // Set the recording id for the socket.
        // This is needed to close the audio pipeline when the socket is closed.
        if (!msg.data.recording?.id) {
            console.log("No recording id found in message");
            return;
        } else if (!socket.recordingId) {
            console.log(`Recording id: ${msg.data.recording.id}`);
            socket.recordingId = msg.data.recording.id;
        }

        // Handle the audio stream event.
        separateAudioStreamsEventHandler({ msg });
    });

    socket.on("close", () => {
        closeAudioStreamsEventHandler({ recordingId: socket.recordingId });
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

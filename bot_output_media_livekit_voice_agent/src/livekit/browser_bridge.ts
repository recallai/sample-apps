// CORE — Output Media page ↔ LiveKit media path.
// Connects to the room, publishes Recall meeting audio, subscribes only to the
// named agent's microphone, and attaches that audio to the page <audio> element
// so Recall can stream it back into the meeting. Reconnect / agent-restart
// handling lives here too.
// Console lifecycle logs are for learning (watch them in Remote DevTools); feel
// free to change them. The media path above is the part to study and reuse.

import {
    ParticipantKind,
    RemoteAudioTrack,
    RemoteParticipant,
    Room,
    RoomEvent,
    Track,
    type Participant,
    type RemoteTrack,
    type RemoteTrackPublication,
} from "livekit-client";
import {
    INITIAL_BRIDGE_STATUS,
    update_bridge_status,
    type BridgePhase,
    type BridgeStatus,
} from "./bridge_status";
import type { LiveKitConnectionDetails } from "./create_bridge_token";
import { is_agent_audio_publication } from "./track_selection";

type LogContext = Record<string, boolean | number | string>;
export type BridgeLogger = (event: string, context?: LogContext) => void;

export interface BrowserBridgeOptions {
    connection_details: LiveKitConnectionDetails;
    audio_element: HTMLAudioElement;
    on_status: (status: BridgeStatus) => void;
    logger?: BridgeLogger;
}

const AGENT_STATE_ATTRIBUTE = "lk.agent.state";
const AGENT_PHASES = new Set<BridgePhase>(["listening", "thinking", "speaking"]);

function default_logger(event: string, context: LogContext = {}): void {
    console.info(
        JSON.stringify({
            event,
            ...context,
        }),
    );
}

export class BrowserBridge {
    private readonly room = new Room();
    private readonly connection_details: LiveKitConnectionDetails;
    private readonly audio_element: HTMLAudioElement;
    private readonly on_status: (status: BridgeStatus) => void;
    private readonly logger: BridgeLogger;
    private readonly started_at = performance.now();
    private status: BridgeStatus = INITIAL_BRIDGE_STATUS;
    private meeting_stream: MediaStream | null = null;
    private meeting_track: MediaStreamTrack | null = null;
    private agent_track: RemoteAudioTrack | null = null;
    private closing = false;
    private first_agent_track_logged = false;
    private first_agent_audio_logged = false;

    constructor({
        connection_details,
        audio_element,
        on_status,
        logger = default_logger,
    }: BrowserBridgeOptions) {
        this.connection_details = connection_details;
        this.audio_element = audio_element;
        this.on_status = on_status;
        this.logger = logger;
        this.audio_element.autoplay = true;
        this.audio_element.addEventListener("playing", this.handle_audio_playing);
        this.emit_status({});
    }

    async connect(): Promise<void> {
        this.register_room_listeners();
        this.emit_status({ phase: "connecting", error: null });
        this.log("livekit_connecting");

        try {
            await this.room.connect(
                this.connection_details.server_url,
                this.connection_details.participant_token,
                { autoSubscribe: false },
            );
            this.emit_status({
                phase: "connected",
                livekit_connected: true,
            });
            this.log("livekit_connected");

            await this.publish_meeting_audio();
            this.reconcile_agent();
        } catch (error) {
            this.fail("Unable to initialize the LiveKit bridge", error);
            throw new Error("Unable to initialize the LiveKit bridge", {
                cause: error,
            });
        }
    }

    async close(): Promise<void> {
        if (this.closing) return;
        this.closing = true;

        this.audio_element.removeEventListener("playing", this.handle_audio_playing);
        this.detach_agent_track();

        if (this.meeting_track) {
            this.meeting_track.removeEventListener("ended", this.handle_meeting_track_ended);
            await this.room.localParticipant
                .unpublishTrack(this.meeting_track, false)
                .catch(() => undefined);
        }

        this.stop_meeting_stream();
        await this.room.disconnect(true);
        this.room.removeAllListeners();
        this.emit_status({
            phase: "disconnected",
            livekit_connected: false,
            meeting_audio_published: false,
            agent_audio_attached: false,
        });
        this.log("bridge_closed");
    }

    private register_room_listeners(): void {
        this.room.on(RoomEvent.Reconnecting, this.handle_reconnecting);
        this.room.on(RoomEvent.Reconnected, this.handle_reconnected);
        this.room.on(RoomEvent.Disconnected, this.handle_disconnected);
        this.room.on(RoomEvent.ParticipantConnected, this.handle_participant_connected);
        this.room.on(
            RoomEvent.ParticipantDisconnected,
            this.handle_participant_disconnected,
        );
        this.room.on(RoomEvent.ParticipantAttributesChanged, this.handle_attributes_changed);
        this.room.on(RoomEvent.TrackPublished, this.handle_track_published);
        this.room.on(RoomEvent.TrackSubscribed, this.handle_track_subscribed);
        this.room.on(RoomEvent.TrackUnpublished, this.handle_track_unpublished);
        this.room.on(RoomEvent.TrackUnsubscribed, this.handle_track_unsubscribed);
        this.room.on(
            RoomEvent.TrackSubscriptionFailed,
            this.handle_track_subscription_failed,
        );
        this.room.on(
            RoomEvent.AudioPlaybackStatusChanged,
            this.handle_audio_playback_changed,
        );
    }

    private async publish_meeting_audio(): Promise<void> {
        if (this.closing) return;

        if (this.meeting_track) {
            this.meeting_track.removeEventListener("ended", this.handle_meeting_track_ended);
            await this.room.localParticipant
                .unpublishTrack(this.meeting_track, true)
                .catch(() => undefined);
        }
        this.stop_meeting_stream();

        const meeting_stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const meeting_track = meeting_stream.getAudioTracks()[0];
        if (!meeting_track) {
            meeting_stream.getTracks().forEach((track) => track.stop());
            throw new Error("Recall meeting audio did not provide an audio track");
        }

        this.meeting_stream = meeting_stream;
        this.meeting_track = meeting_track;
        meeting_track.addEventListener("ended", this.handle_meeting_track_ended);

        await this.room.localParticipant.publishTrack(meeting_track, {
            name: "recall-meeting-audio",
            source: Track.Source.Microphone,
        });

        this.emit_status({ meeting_audio_published: true });
        this.log("meeting_audio_published");
    }

    private reconcile_agent(): void {
        const participant = this.room.remoteParticipants.get(
            this.connection_details.agent_identity,
        );
        if (!participant) {
            this.detach_agent_track();
            this.emit_status({ phase: "connected", agent_audio_attached: false });
            this.log("agent_waiting");
            return;
        }

        this.apply_agent_state(participant);
        participant.trackPublications.forEach((publication) => {
            this.subscribe_to_agent_publication(publication, participant);
        });
    }

    private subscribe_to_agent_publication(
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
    ): void {
        if (
            !is_agent_audio_publication(
                participant,
                publication,
                this.connection_details.agent_identity,
            )
        ) {
            return;
        }

        publication.setSubscribed(true);
        this.log("agent_audio_subscription_requested");

        if (publication.track instanceof RemoteAudioTrack) {
            this.log_first_agent_track();
            void this.attach_agent_track(publication.track);
        }
    }

    private async attach_agent_track(track: RemoteAudioTrack): Promise<void> {
        if (this.agent_track === track) return;

        this.detach_agent_track();
        this.agent_track = track;
        track.attach(this.audio_element);

        try {
            if (!this.room.canPlaybackAudio) {
                await this.room.startAudio();
            }
            await this.audio_element.play();
            this.emit_status({ agent_audio_attached: true });
            this.log("agent_audio_attached");
        } catch (error) {
            this.fail(
                "Agent audio autoplay failed in the Output Media browser",
                error,
            );
        }
    }

    private detach_agent_track(): void {
        if (this.agent_track) {
            this.agent_track.detach(this.audio_element);
            this.agent_track = null;
        }
        this.audio_element.srcObject = null;
        this.emit_status({ agent_audio_attached: false });
    }

    private stop_meeting_stream(): void {
        this.meeting_stream?.getTracks().forEach((track) => track.stop());
        this.meeting_stream = null;
        this.meeting_track = null;
    }

    private apply_agent_state(participant: RemoteParticipant): void {
        const agent_state = participant.attributes[AGENT_STATE_ATTRIBUTE];
        if (agent_state && AGENT_PHASES.has(agent_state as BridgePhase)) {
            this.emit_status({ phase: agent_state as BridgePhase });
            this.log("agent_state_changed", { state: agent_state });
        } else if (this.status.livekit_connected) {
            this.emit_status({ phase: "connected" });
        }
    }

    private emit_status(patch: Partial<BridgeStatus>): void {
        this.status = update_bridge_status(this.status, patch);
        this.on_status(this.status);
    }

    private log(event: string, context: LogContext = {}): void {
        performance.mark(`recall-${event}`);
        this.logger(event, {
            elapsed_ms: Math.round(performance.now() - this.started_at),
            ...context,
        });
    }

    private log_first_agent_track(): void {
        if (this.first_agent_track_logged) return;
        this.first_agent_track_logged = true;
        this.log("first_agent_track");
    }

    private fail(message: string, error?: unknown): void {
        this.emit_status({
            phase: "failed",
            error: message,
        });
        performance.mark("recall-bridge-failed");
        this.logger("bridge_failed", {
            elapsed_ms: Math.round(performance.now() - this.started_at),
            error_type: error instanceof Error ? error.constructor.name : "UnknownError",
        });
    }

    private readonly handle_reconnecting = (): void => {
        this.emit_status({ phase: "reconnecting", livekit_connected: false });
        this.log("livekit_reconnecting");
    };

    private readonly handle_reconnected = (): void => {
        this.emit_status({ phase: "connected", livekit_connected: true });
        this.log("livekit_reconnected");
        this.reconcile_agent();
    };

    private readonly handle_disconnected = (): void => {
        if (this.closing) return;
        this.detach_agent_track();
        this.meeting_track?.removeEventListener(
            "ended",
            this.handle_meeting_track_ended,
        );
        this.stop_meeting_stream();
        this.emit_status({
            phase: "failed",
            livekit_connected: false,
            meeting_audio_published: false,
            error: "The LiveKit room disconnected",
        });
        this.log("livekit_disconnected");
    };

    private readonly handle_participant_connected = (
        participant: RemoteParticipant,
    ): void => {
        if (participant.identity !== this.connection_details.agent_identity) return;
        this.log("agent_connected", {
            participant_kind_is_agent: participant.kind === ParticipantKind.AGENT,
        });
        this.reconcile_agent();
    };

    private readonly handle_participant_disconnected = (
        participant: RemoteParticipant,
    ): void => {
        if (participant.identity !== this.connection_details.agent_identity) return;
        this.detach_agent_track();
        this.emit_status({ phase: "connected" });
        this.log("agent_disconnected");
    };

    private readonly handle_attributes_changed = (
        _changed_attributes: Record<string, string>,
        participant: Participant,
    ): void => {
        if (!(participant instanceof RemoteParticipant)) return;
        if (participant.identity !== this.connection_details.agent_identity) return;
        this.apply_agent_state(participant);
    };

    private readonly handle_track_published = (
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
    ): void => {
        this.subscribe_to_agent_publication(publication, participant);
    };

    private readonly handle_track_subscribed = (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
    ): void => {
        if (
            track instanceof RemoteAudioTrack &&
            is_agent_audio_publication(
                participant,
                publication,
                this.connection_details.agent_identity,
            )
        ) {
            this.log_first_agent_track();
            void this.attach_agent_track(track);
        }
    };

    private readonly handle_track_unpublished = (
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
    ): void => {
        if (
            is_agent_audio_publication(
                participant,
                publication,
                this.connection_details.agent_identity,
            )
        ) {
            this.detach_agent_track();
            this.log("agent_audio_unpublished");
        }
    };

    private readonly handle_track_unsubscribed = (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
    ): void => {
        if (
            track === this.agent_track &&
            is_agent_audio_publication(
                participant,
                publication,
                this.connection_details.agent_identity,
            )
        ) {
            this.detach_agent_track();
            this.log("agent_audio_unsubscribed");
        }
    };

    private readonly handle_track_subscription_failed = (
        _track_sid: string,
        participant: RemoteParticipant,
    ): void => {
        if (participant.identity !== this.connection_details.agent_identity) return;
        this.fail("Unable to subscribe to the LiveKit Agent audio track");
    };

    private readonly handle_audio_playback_changed = (playing: boolean): void => {
        if (!playing && this.agent_track) {
            this.fail("The browser blocked LiveKit Agent audio playback");
        }
    };

    private readonly handle_meeting_track_ended = (): void => {
        if (this.closing) return;
        this.emit_status({ meeting_audio_published: false });
        this.log("meeting_audio_ended");
        void this.publish_meeting_audio().catch((error: unknown) => {
            this.fail("Unable to reacquire Recall meeting audio", error);
        });
    };

    private readonly handle_audio_playing = (): void => {
        if (this.first_agent_audio_logged) return;
        this.first_agent_audio_logged = true;
        this.log("first_agent_audio");
    };
}

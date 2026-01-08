import { useCallback } from "react";
import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

/**
 * Enables the HeyGen avatar to listen to meeting audio and speak responses.
 * Call startListening() then unmuteMic() after the session is connected.
 */
export const useLiveAvatarActions = () => {
  const { sessionRef, isUserTalking } = useLiveAvatarContext();

  const unmuteMic = useCallback(async () => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.voiceChat.unmute();
  }, [sessionRef]);

  const startListening = useCallback(async () => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.voiceChat.start();
  }, [sessionRef]);

  return {
    startListening,
    unmuteMic,
    isUserTalking,
  };
};

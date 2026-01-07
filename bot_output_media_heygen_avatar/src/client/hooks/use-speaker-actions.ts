import { useCallback } from "react";
import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

export const useSpeakerActions = () => {
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

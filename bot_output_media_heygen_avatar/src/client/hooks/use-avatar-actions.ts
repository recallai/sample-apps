import { useCallback } from "react";
import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

export const useAvatarActions = () => {
  const { sessionRef } = useLiveAvatarContext();

  /**
   * Sends a message to the avatar's AI, which generates and speaks a response.
   */
  const speakMessage = useCallback(
    async (text: string) => {
      if (!sessionRef.current) {
        throw new Error("Session is not initialized");
      }
      return sessionRef.current.message(text);
    },
    [sessionRef],
  );

  /**
   * Interrupts the avatar's current speech.
   */
  const interrupt = useCallback(() => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.interrupt();
  }, [sessionRef]);

  const repeat = useCallback(
    async (message: string) => {
      if (!sessionRef.current) {
        throw new Error("Session is not initialized");
      }

      return sessionRef.current.repeat(message);
    },
    [sessionRef],
  );

  const startListening = useCallback(() => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.startListening();
  }, [sessionRef]);

  const stopListening = useCallback(() => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.stopListening();
  }, [sessionRef]);

  return {
    speakMessage,
    interrupt,
    repeat,
    startListening,
    stopListening,
  };
};

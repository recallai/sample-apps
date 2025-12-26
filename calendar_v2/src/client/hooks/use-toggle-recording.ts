import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

export function useToggleRecording(props: {
    calendarId: string;
    calendarEventId: string;
}) {
    const { calendarId: _calendarId, calendarEventId } = z.object({
        calendarId: z.string(),
        calendarEventId: z.string(),
    }).parse(props);

    const queryClient = useQueryClient();

    const { mutate: scheduleRecording, isPending: isScheduling } = useMutation({
        mutationFn: async () => {
            const url = new URL("/api/calendar/events/bot", window.location.origin);
            url.searchParams.set("calendar_event_id", calendarEventId);

            const res = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!res.ok) throw new Error(await res.text());

            return { isScheduled: true };
        },
        onSuccess: () => {
            toast.success("Recording scheduled");
            void queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
        },
        onError: (error) => {
            console.error("Error scheduling recording:", error);
            toast.error("Failed to schedule recording. See console for details.");
        },
    });

    const { mutate: unscheduleRecording, isPending: isUnscheduling } = useMutation({
        mutationFn: async () => {
            const url = new URL("/api/calendar/events/bot", window.location.origin);
            url.searchParams.set("calendar_event_id", calendarEventId);

            const res = await fetch(url.toString(), {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!res.ok) throw new Error(await res.text());

            return { isUnscheduled: true };
        },
        onSuccess: () => {
            toast.success("Recording cancelled");
            void queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
        },
        onError: (error) => {
            console.error("Error cancelling recording:", error);
            toast.error("Failed to cancel recording. See console for details.");
        },
    });

    return {
        scheduleRecording,
        unscheduleRecording,
        isScheduling,
        isUnscheduling,
        isPending: isScheduling || isUnscheduling,
    };
}


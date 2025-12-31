import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

export function useDeleteCalendar(props: { calendarId: string | null }) {
    const { calendarId } = z.object({ calendarId: z.string().nullable() }).parse(props);
    const queryClient = useQueryClient();

    const { mutate: deleteCalendar, isPending: isDeleting } = useMutation({
        mutationFn: async () => {
            const url = new URL("/api/calendar", window.location.origin);
            if (calendarId) url.searchParams.set("calendar_id", calendarId);

            const res = await fetch(url.toString(), {
                method: "DELETE",
                headers: { 
                    "Content-Type": "application/json",
                },
            });
            if (!res.ok) throw new Error(await res.text());

            return { isDeleted: true };
        },
        onSuccess: () => {
            toast.success("Calendar disconnected successfully");
            void queryClient.invalidateQueries({ queryKey: ["calendars"] });
        },
        onError: (error) => {
            console.error("Error deleting calendar:", error);
            toast.error("Failed to disconnect calendar. See console for details.");
        },
    });

    return { deleteCalendar, isDeleting };
}
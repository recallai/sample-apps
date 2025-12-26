import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { CalendarSchema } from "../../schemas/CalendarArtifactSchema";

export function useCalendar(props: { email: string | null }) {
    const { email } = z.object({ email: z.string().nullable() }).parse(props);

    const { data: results, isPending } = useQuery({
        queryKey: ["calendars", email],
        queryFn: async () => {
            try {
                const url = new URL("/api/calendar", window.location.origin);
                if (email) url.searchParams.set("platform_email", email);

                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(await res.text());

                const data = z
                    .object({ calendars: CalendarSchema.array() })
                    .parse(await res.json());

                if (data.calendars[0]?.platform_email) {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set("platform_email", data.calendars[0].platform_email);
                    window.history.pushState({}, "", newUrl.toString());
                }

                return data;
            } catch (error) {
                console.error("Error fetching calendars:", error);
                toast.error("Failed to fetch calendars. See console for details.");
            }
        },
        enabled: !!email,
    });

    return { calendars: results?.calendars ?? [], isPending };
}
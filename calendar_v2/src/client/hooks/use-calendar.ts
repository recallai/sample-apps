import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CalendarSchema } from "../../schemas/CalendarSchema";

export function useCalendar(props: { email: string | null }) {
    const { email } = z.object({ email: z.string().nullable() }).parse(props);

    const { data: calendars = [] } = useQuery({
        queryKey: ["calendars", email],
        queryFn: async () => {
            try {
                const res = await fetch(`/api/calendar?platform_email=${email}`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch calendar: ${res.statusText}`);
                }
                const data = z
                    .object({ calendars: CalendarSchema.array() })
                    .parse(await res.json());
                return data.calendars;
            } catch (error) {
                alert(`Error fetching calendar: ${error}`);
                console.error("Error fetching calendar:", error);
                return [];
            }
        },
        enabled: !!email,
    });

    return { calendars };
}
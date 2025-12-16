import { z } from "zod";

export const CmdLineArgsSchema = z.object({
    start_date_utc: z.string({ message: "--start_date_utc is required" }).refine(
        (date) => new Date(date) < new Date(new Date().getTime() + 1 * 60 * 1000),
        { message: "--start_date_utc must be in the past" },
    ),
    end_date_utc: z.string().optional(),
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : {}),
    help: z.boolean().optional(),
});
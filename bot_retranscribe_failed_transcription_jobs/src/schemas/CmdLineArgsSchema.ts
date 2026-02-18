import { z } from "zod";

export const CmdLineArgsSchema = z.object({
    start_date_utc: z.string({ message: "--start_date_utc is required" }),
    end_date_utc: z.string().optional(),
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : {}),
    transcript_config: z.string({ message: "--transcript_config is required" }).transform((v) => JSON.parse(v)),
    help: z.boolean().optional(),
});

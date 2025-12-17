import { z } from "zod";

export const CmdLineArgsSchema = z.object({
    start_date_utc: z.string().optional(),
    end_date_utc: z.string().optional(),
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : {}),
    help: z.boolean().optional(),
});

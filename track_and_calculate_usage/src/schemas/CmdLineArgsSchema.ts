import { z } from "zod";

const USAGE_TYPES = ["bot"] as const;

export const CmdLineArgsSchema = z.object({
    type: z.enum(USAGE_TYPES, { message: `--type must be one of: ${USAGE_TYPES.join(", ")}` }),
    start_date: z.string({ message: "--start_date is required" }),
    end_date: z.string({ message: "--end_date is required" }),
    metadata: z.string().optional().transform((v) => v ? JSON.parse(v) : {}),
    help: z.boolean().optional(),
});
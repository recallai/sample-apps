import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.string().transform((val) => parseInt(val)).default(4000),
});

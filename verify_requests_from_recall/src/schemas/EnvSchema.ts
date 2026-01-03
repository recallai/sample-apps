import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.string().transform((val) => parseInt(val)).default(4000),
    // Workspace verification secret or Svix webhook secret
    VERIFICATION_SECRET: z.string().startsWith("whsec_"),
});
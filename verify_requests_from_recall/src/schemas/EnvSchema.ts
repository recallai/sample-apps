import { z } from "zod";

export const EnvSchema = z.object({
    PORT: z.number().default(4000),
    // Workspace verification secret or Svix webhook secret
    VERIFICATION_SECRET: z.string().startsWith("whsec_"),
});
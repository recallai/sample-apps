import dotenv from "dotenv";
import { EnvSchema } from "../../schemas/EnvSchema";

dotenv.config();

const env = EnvSchema.parse(process.env);

export { env };
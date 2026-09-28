import { z } from "zod";

/** Configuração validada no boot: se faltar algo, o servidor nem sobe. */
const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3004),
  DATABASE_PATH: z.string().default("data/app.db"),

  AI_PROVIDER: z.enum(["ollama", "anthropic"]).default("ollama"),
  AI_MODEL: z.string().default("qwen3.5:9b"),
  AI_MAX_STEPS: z.coerce.number().int().min(1).max(25).default(8),
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434/v1"),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(parsed.error)}`);
  }
  const config = parsed.data;
  if (config.AI_PROVIDER === "anthropic" && !config.ANTHROPIC_API_KEY) {
    throw new Error("AI_PROVIDER=anthropic exige ANTHROPIC_API_KEY");
  }
  return config;
}

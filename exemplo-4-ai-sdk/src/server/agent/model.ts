import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import type { Config } from "../config";

/**
 * O único lugar que sabe qual provedor de LLM está em uso.
 * Trocar Ollama por Anthropic (ou adicionar outro) é mudar config, não código.
 */
export function createModel(config: Config): LanguageModel {
  switch (config.AI_PROVIDER) {
    case "ollama":
      // Ollama expõe uma API compatível com a da OpenAI em /v1.
      return createOpenAICompatible({
        name: "ollama",
        baseURL: config.OLLAMA_BASE_URL,
        includeUsage: true,
      }).chatModel(config.AI_MODEL);
    case "anthropic":
      return createAnthropic({ apiKey: config.ANTHROPIC_API_KEY })(config.AI_MODEL);
  }
}

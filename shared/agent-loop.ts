import Anthropic from "@anthropic-ai/sdk";

// Lê ANTHROPIC_API_KEY e ANTHROPIC_BASE_URL do ambiente.
// Apontando o BASE_URL para o Ollama, o mesmo código fala com um modelo local.
const client = new Anthropic();

interface RodarAgenteParams {
  mensagem: string;
  system: string;
  tools: Anthropic.Tool[];
  // Quem executa a tool de verdade é o NOSSO código, não o LLM.
  executar: (nome: string, input: unknown) => Promise<unknown>;
}

/**
 * O loop de tool calling. Idêntico nos dois exemplos:
 * a diferença entre eles está em COMO as tools são definidas e executadas.
 */
export async function rodarAgente({ mensagem, system, tools, executar }: RodarAgenteParams) {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: mensagem }];
  const log: string[] = [];

  for (let i = 0; i < 10; i++) {
    // 1. Manda o histórico + a lista de tools para o modelo
    const resp = await client.messages.create({
      model: process.env.MODEL ?? "claude-sonnet-5",
      max_tokens: 4096, // folga para modelos que "pensam" antes de chamar a tool (ex: qwen3.5)
      system,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: resp.content });

    // 2. Se o modelo não pediu nenhuma tool, terminou
    if (resp.stop_reason !== "tool_use") {
      const resposta = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { resposta, log };
    }

    // 3. Executa cada tool pedida e devolve o resultado ao modelo
    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;
      log.push(`${block.name}(${JSON.stringify(block.input)})`);
      try {
        const saida = await executar(block.name, block.input);
        resultados.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(saida) });
      } catch (e) {
        const erro = e instanceof Error ? e.message : String(e);
        log.push(`  ↳ erro: ${erro}`);
        resultados.push({ type: "tool_result", tool_use_id: block.id, content: erro, is_error: true });
      }
    }
    messages.push({ role: "user", content: resultados });
    // 4. Volta ao passo 1 com os resultados
  }

  throw new Error("O agente passou do limite de iterações");
}

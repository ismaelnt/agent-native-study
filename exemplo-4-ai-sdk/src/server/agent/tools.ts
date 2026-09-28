import { tool, type ToolSet } from "ai";

import type { ActionContext } from "../../core/action";
import type { ActionRegistry } from "../../core/registry";

/**
 * Actions → tools do AI SDK. Nenhuma tool é escrita à mão.
 *
 * Montadas POR REQUISIÇÃO por dois motivos:
 * 1. Permissão: o modelo só recebe as tools que ESTE usuário pode usar.
 *    O estagiário nem fica sabendo que "pedidos_cancelar" existe.
 * 2. Contexto: o `execute` já leva quem é o usuário; o modelo não consegue
 *    trocar de identidade, porque isso não é um parâmetro da tool.
 *
 * O `execute` chama o MESMO registry.execute que a UI usa. Se a action
 * lançar ActionError, o AI SDK devolve a mensagem ao modelo como erro da tool.
 */
export function buildAgentTools(registry: ActionRegistry, ctx: ActionContext): ToolSet {
  const actions = registry.listFor(ctx.actor, { surface: "agent" });
  return Object.fromEntries(
    actions.map((action) => [
      action.name,
      tool({
        description: action.description,
        inputSchema: action.input,
        execute: (input: unknown) => registry.execute(action.name, input, ctx),
      }),
    ]),
  );
}

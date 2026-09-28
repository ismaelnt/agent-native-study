import { z } from "zod";

import type { ActionContext, Actor, AnyAction, ModuleDefinition } from "./action";
import { ActionError, ERRO_INTERNO } from "./errors";
import type { ChangeBus } from "./events";

export interface Logger {
  info(event: string, data: Record<string, unknown>): void;
  error(event: string, data: Record<string, unknown>): void;
}

export interface ActionRegistry {
  /** O único caminho de execução. UI, HTTP e agente chamam isto. */
  execute(name: string, rawInput: unknown, ctx: ActionContext): Promise<unknown>;
  /** Actions que este ator pode usar. Filtra permissão ANTES de chegar ao modelo. */
  listFor(actor: Actor, opts?: { surface?: "agent" }): AnyAction[];
  modules: readonly ModuleDefinition[];
}

export function createActionRegistry(deps: {
  modules: readonly ModuleDefinition[];
  bus: ChangeBus;
  logger: Logger;
}): ActionRegistry {
  const byName = new Map<string, { action: AnyAction; module: ModuleDefinition }>();

  for (const module of deps.modules) {
    for (const action of module.actions) {
      if (byName.has(action.name)) {
        // Falha no boot, não em produção às 3h da manhã.
        throw new Error(`Action duplicada: "${action.name}"`);
      }
      if (!action.name.startsWith(`${module.name}_`)) {
        throw new Error(`Action "${action.name}" deve usar o prefixo do módulo "${module.name}_"`);
      }
      byName.set(action.name, { action, module });
    }
  }

  const can = (actor: Actor, action: AnyAction) =>
    !action.permission || actor.permissoes.includes(action.permission);

  return {
    modules: deps.modules,

    listFor(actor, opts) {
      return [...byName.values()]
        .map((entry) => entry.action)
        .filter((action) => can(actor, action))
        .filter((action) => opts?.surface !== "agent" || action.agent !== false);
    },

    async execute(name, rawInput, ctx) {
      const started = performance.now();
      const entry = byName.get(name);
      const log = { action: name, origin: ctx.origin, actor: ctx.actor.id, requestId: ctx.requestId };

      try {
        if (!entry) throw new ActionError(`Action desconhecida: ${name}`, "action_desconhecida");
        const { action, module } = entry;

        // 1. Autorização: mesma regra para botão, API e agente.
        if (!can(ctx.actor, action)) {
          throw new ActionError(`Você não tem permissão para "${name}"`, "sem_permissao");
        }

        // 2. Validação: o schema é a fonte única do contrato.
        const parsed = action.input.safeParse(rawInput ?? {});
        if (!parsed.success) {
          throw new ActionError(`Entrada inválida: ${z.prettifyError(parsed.error)}`, "entrada_invalida");
        }

        // 3. Regra de negócio.
        const output = await action.run(parsed.data, ctx);

        // 4. Avisa quem estiver olhando que o recurso mudou.
        if (!action.readOnly) {
          deps.bus.publish({
            resource: module.name,
            action: name,
            actorId: ctx.actor.id,
            origin: ctx.origin,
            at: new Date().toISOString(),
          });
        }

        deps.logger.info("action.ok", { ...log, ms: Math.round(performance.now() - started) });
        return output;
      } catch (error) {
        const ms = Math.round(performance.now() - started);
        if (error instanceof ActionError) {
          deps.logger.info("action.recusada", { ...log, ms, code: error.code, message: error.message });
          throw error;
        }
        // Erro inesperado: detalhe só no log, nunca para quem chamou (nem para o LLM).
        deps.logger.error("action.falhou", { ...log, ms, error: String(error) });
        throw new Error(ERRO_INTERNO, { cause: error });
      }
    },
  };
}

export const consoleLogger: Logger = {
  info: (event, data) => console.log(JSON.stringify({ level: "info", event, ...data })),
  error: (event, data) => console.error(JSON.stringify({ level: "error", event, ...data })),
};

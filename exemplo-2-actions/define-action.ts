/**
 * Uma versão MÍNIMA (didática) da ideia do Agent-Native: uma "action" é
 * a única definição de uma capacidade. Não é a API real do framework —
 * é o conceito reduzido ao essencial para você enxergar o mecanismo.
 */
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

// Contexto de quem está executando: o mesmo para UI e agente.
export interface ActionContext {
  origem: "ui" | "agente";
  tela?: { pedidoSelecionado?: string | null }; // o que o usuário está vendo
}

export interface Action<Schema extends z.ZodObject = z.ZodObject, Saida = unknown> {
  name: string;
  description: string;
  input: Schema;
  run: (input: z.infer<Schema>, ctx: ActionContext) => Promise<Saida>;
}

export function defineAction<Schema extends z.ZodObject, Saida>(action: Action<Schema, Saida>) {
  return action;
}

/** Executa uma action validando o input — usado pela UI (HTTP) E pelo agente. */
export async function executarAction(action: Action, inputBruto: unknown, ctx: ActionContext) {
  const input = action.input.parse(inputBruto); // mesma validação para todo mundo
  return action.run(input, ctx);
}

/** Gera a tool do agente a partir da action. Nada escrito à mão. */
export function actionParaTool(action: Action): Anthropic.Tool {
  const { $schema, ...schema } = z.toJSONSchema(action.input) as Record<string, unknown>;
  return {
    name: action.name,
    description: action.description,
    input_schema: schema as Anthropic.Tool.InputSchema,
  };
}

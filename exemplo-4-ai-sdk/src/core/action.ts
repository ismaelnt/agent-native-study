import type { z } from "zod";

/** Quem está agindo. O agente age SEMPRE em nome de um usuário, nunca como "admin". */
export interface Actor {
  id: string;
  nome: string;
  permissoes: readonly string[];
}

/** Por onde a chamada entrou. Útil para auditoria e métricas, nunca para regra de negócio. */
export type Origin = "ui" | "agente" | "http" | "teste";

export interface ActionContext {
  actor: Actor;
  origin: Origin;
  /** Id de correlação: liga os logs de uma mesma requisição/turno do agente. */
  requestId: string;
}

export interface ActionDefinition<
  Name extends string = string,
  Input extends z.ZodType = z.ZodType,
  Output = unknown,
> {
  /**
   * Nome único e estável, com prefixo do módulo: "pedidos_cancelar".
   * Usa "_" porque provedores de LLM só aceitam [a-zA-Z0-9_-] em nomes de tool.
   */
  name: Name;
  /** Lida pelo modelo para decidir quando usar a action. É prompt, escreva com cuidado. */
  description: string;
  input: Input;
  /** Permissão exigida. Vale para UI, HTTP e agente, porque todos passam pelo registry. */
  permission?: string;
  /** Não altera estado: pode ser repetida e não dispara evento de mudança. */
  readOnly?: boolean;
  /** Expor ao agente? Algumas actions são só para a UI (ex.: preferências de layout). */
  agent?: boolean;
  run: (input: z.output<Input>, ctx: ActionContext) => Promise<Output>;
}

// `any` aqui é deliberado: um registry heterogêneo precisa aceitar qualquer action.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAction = ActionDefinition<string, z.ZodType, any>;

/** Identidade tipada: só existe para inferir Name/Input/Output de cada action. */
export function defineAction<const Name extends string, Input extends z.ZodType, Output>(
  def: ActionDefinition<Name, Input, Output>,
): ActionDefinition<Name, Input, Output> {
  return def;
}

/**
 * Um módulo de domínio. O app é a soma dos módulos; crescer o sistema
 * é adicionar módulos, sem mexer nas superfícies (HTTP, agente, UI).
 */
export interface ModuleDefinition<Actions extends readonly AnyAction[] = readonly AnyAction[]> {
  /** Também é o "recurso" dos eventos de mudança e das query keys da UI. */
  name: string;
  /** Instruções específicas do domínio para o agente. */
  agentInstructions?: string;
  actions: Actions;
}

export function defineModule<const Actions extends readonly AnyAction[]>(
  mod: ModuleDefinition<Actions>,
): ModuleDefinition<Actions> {
  return mod;
}

// ── Tipos derivados, usados pelo cliente tipado da UI ──────────────────────

/** União de todas as actions de uma lista de módulos. */
export type ActionsOf<Modules extends readonly ModuleDefinition[]> = Modules[number]["actions"][number];

export type ActionNameOf<A extends AnyAction> = A["name"];
export type ActionByName<A extends AnyAction, N extends string> = Extract<A, { name: N }>;
export type ActionInput<A> = A extends ActionDefinition<string, infer I, unknown> ? z.input<I> : never;
export type ActionOutput<A> = A extends ActionDefinition<string, z.ZodType, infer O> ? Awaited<O> : never;

/**
 * O "manifesto" do app: quais módulos existem. Para adicionar um domínio
 * (clientes, estoque, financeiro…), crie src/modules/<nome> e registre aqui.
 * HTTP, agente, eventos e o cliente tipado da UI passam a enxergá-lo sozinhos.
 */
import type { ActionsOf } from "../core/action";
import type { Migration } from "../infra/db";
import { createPedidosModule } from "../modules/pedidos";
import { pedidosMigrations, type PedidosRepository } from "../modules/pedidos/pedidos.repository";

export interface AppDeps {
  pedidosRepo: PedidosRepository;
}

export function buildModules(deps: AppDeps) {
  return [createPedidosModule({ repo: deps.pedidosRepo })] as const;
}

export const appMigrations: readonly Migration[] = [...pedidosMigrations];

/** União tipada de todas as actions do app. A UI importa só este TIPO. */
export type AppAction = ActionsOf<ReturnType<typeof buildModules>>;
export type AppActionName = AppAction["name"];

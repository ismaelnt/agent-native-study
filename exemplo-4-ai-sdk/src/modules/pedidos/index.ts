import { z } from "zod";

import { defineAction, defineModule } from "../../core/action";
import { ActionError } from "../../core/errors";
import type { PedidosRepository } from "./pedidos.repository";

/**
 * O módulo recebe suas dependências (injeção via factory) em vez de importar
 * o banco direto. Isso mantém o domínio testável e troca de infra barata.
 */
export function createPedidosModule({ repo }: { repo: PedidosRepository }) {
  const listar = defineAction({
    name: "pedidos_listar",
    description: "Lista todos os pedidos da loja com id, cliente, valor e status.",
    input: z.object({}),
    permission: "pedidos:ler",
    readOnly: true,
    run: () => repo.listar(),
  });

  const buscar = defineAction({
    name: "pedidos_buscar",
    description: "Busca um pedido pelo id.",
    input: z.object({ pedidoId: z.string().describe("Id do pedido, ex.: 1004") }),
    permission: "pedidos:ler",
    readOnly: true,
    run: async ({ pedidoId }) => {
      const pedido = await repo.buscar(pedidoId);
      if (!pedido) throw new ActionError(`Pedido ${pedidoId} não encontrado`, "nao_encontrado");
      return pedido;
    },
  });

  const cancelar = defineAction({
    name: "pedidos_cancelar",
    description:
      "Cancela um pedido pelo id. Pedidos já enviados ou cancelados não podem ser cancelados.",
    input: z.object({ pedidoId: z.string().describe("Id do pedido a cancelar") }),
    permission: "pedidos:cancelar",
    run: async ({ pedidoId }) => {
      const pedido = await repo.buscar(pedidoId);
      if (!pedido) throw new ActionError(`Pedido ${pedidoId} não encontrado`, "nao_encontrado");

      // A regra existe em UM lugar. Vale para botão, API, agente e testes.
      if (pedido.status === "enviado" || pedido.status === "cancelado") {
        throw new ActionError(
          `Pedido ${pedido.id} está "${pedido.status}" e não pode ser cancelado`,
          "regra_de_negocio",
        );
      }
      return repo.atualizarStatus(pedidoId, "cancelado");
    },
  });

  const restaurar = defineAction({
    name: "pedidos_restaurar",
    description: "Restaura os pedidos de exemplo para o estado inicial.",
    input: z.object({}),
    permission: "pedidos:restaurar",
    // Utilidade da demo, não é regra de negócio: fica só na UI, fora das tools do agente.
    agent: false,
    run: () => repo.restaurar(),
  });

  return defineModule({
    name: "pedidos",
    agentInstructions:
      'Quando o usuário disser "esse", "este" ou "o selecionado", use o pedidoSelecionado da tela. ' +
      "Se nenhum pedido estiver selecionado, pergunte qual.",
    actions: [listar, buscar, cancelar, restaurar],
  });
}

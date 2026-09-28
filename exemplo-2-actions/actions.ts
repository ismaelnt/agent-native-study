/**
 * TODAS as capacidades do app vivem aqui, uma única vez.
 * A UI, a API HTTP e o agente consomem exatamente estas funções.
 */
import { z } from "zod";
import { db } from "../shared/db.js";
import { defineAction } from "./define-action.js";

export const listarPedidos = defineAction({
  name: "listarPedidos",
  description: "Lista todos os pedidos da loja com id, cliente, valor e status",
  input: z.object({}),
  run: async () => db.pedidos,
});

export const cancelarPedido = defineAction({
  name: "cancelarPedido",
  description:
    "Cancela um pedido pelo id. Pedidos já enviados ou cancelados não podem ser cancelados.",
  input: z.object({
    pedidoId: z.string().describe("Id do pedido a cancelar"),
  }),
  run: async ({ pedidoId }, ctx) => {
    const pedido = db.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) throw new Error("Pedido não encontrado");

    // A regra existe em UM lugar. Vale para o botão e para o agente.
    if (pedido.status === "enviado" || pedido.status === "cancelado") {
      throw new Error(`Pedido ${pedido.id} está "${pedido.status}" e não pode ser cancelado`);
    }
    pedido.status = "cancelado";
    console.log(`[${ctx.origem}] cancelou o pedido ${pedido.id}`);
    return pedido;
  },
});

// O "registro" de actions: adicionar uma capacidade nova = adicionar aqui.
export const actions = [listarPedidos, cancelarPedido];

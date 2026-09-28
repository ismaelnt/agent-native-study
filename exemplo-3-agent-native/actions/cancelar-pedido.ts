// A regra de negócio existe em UM lugar. O botão da tela (useActionMutation),
// o agente (tool), HTTP, CLI e MCP passam todos por aqui.
import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "@agent-native/core/db/schema";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";

export default defineAction({
  description:
    "Cancela um pedido pelo id. Pedidos já enviados ou cancelados não podem ser cancelados.",
  schema: z.object({
    pedidoId: z.string().describe("Id do pedido a cancelar"),
  }),
  run: async ({ pedidoId }) => {
    const db = getDb();
    const [pedido] = await db
      .select()
      .from(schema.pedidos)
      .where(eq(schema.pedidos.id, pedidoId));

    // fail() devolve a mensagem para quem chamou (UI ou agente).
    // Um throw comum viraria um 500 genérico, por segurança.
    if (!pedido) fail("Pedido não encontrado", { statusCode: 404 });

    if (pedido.status === "enviado" || pedido.status === "cancelado") {
      fail(`Pedido ${pedido.id} está "${pedido.status}" e não pode ser cancelado`);
    }

    const [atualizado] = await db
      .update(schema.pedidos)
      .set({ status: "cancelado" })
      .where(eq(schema.pedidos.id, pedidoId))
      .returning();
    return atualizado;
  },
});

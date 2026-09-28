// Volta os pedidos para o estado inicial (os mesmos 4 do seed em server/plugins/db.ts).
// Útil para repetir a demo depois de cancelar tudo, pela tela ou pelo agente.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";

const PEDIDOS_INICIAIS = [
  { id: "1001", cliente: "Ana", valor: 129.9, status: "pendente" },
  { id: "1002", cliente: "Bruno", valor: 89.5, status: "pago" },
  { id: "1003", cliente: "Carla", valor: 249.0, status: "enviado" },
  { id: "1004", cliente: "Diego", valor: 59.9, status: "pendente" },
];

export default defineAction({
  description:
    "Restaura os pedidos de exemplo para o estado inicial. Só use quando o usuário pedir explicitamente para resetar/restaurar os dados.",
  schema: z.object({}),
  run: async () => {
    const db = getDb();
    await db.delete(schema.pedidos);
    return db.insert(schema.pedidos).values(PEDIDOS_INICIAIS).returning();
  },
});

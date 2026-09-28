// Compare com exemplo-2-actions/actions.ts: mesma ideia, agora com o defineAction real.
// O nome da action vem do nome do arquivo: "listar-pedidos".
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";

export default defineAction({
  description: "Lista todos os pedidos da loja com id, cliente, valor e status.",
  schema: z.object({}),
  http: { method: "GET" }, // GET => readOnly automático
  run: async () => {
    return getDb().select().from(schema.pedidos).orderBy(schema.pedidos.id);
  },
});

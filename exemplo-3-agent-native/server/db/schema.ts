// Mesmos dados do shared/db.ts dos exemplos 1 e 2, mas agora em SQL (PGlite local).
// UI e agente leem e escrevem nesta mesma tabela.
import { doublePrecision, table, text } from "@agent-native/core/db/schema";

export const pedidos = table("pedidos", {
  id: text("id").primaryKey(),
  cliente: text("cliente").notNull(),
  valor: doublePrecision("valor").notNull(),
  status: text("status").notNull(), // pendente | pago | enviado | cancelado
});

import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { eq } from "@agent-native/core/db/schema";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";

export default defineAction({
  description:
    "See what the user is currently looking at on screen. Returns the current navigation state and, on the orders page, the selected order. Always call this first before taking any action.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = (await readAppState("navigation")) as {
      view?: string;
      pedidoSelecionado?: string;
    } | null;

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;

    // A navegação guarda só o id; aqui buscamos o registro atual no banco.
    if (navigation?.pedidoSelecionado) {
      const [pedido] = await getDb()
        .select()
        .from(schema.pedidos)
        .where(eq(schema.pedidos.id, navigation.pedidoSelecionado));
      screen.pedidoSelecionado = pedido ?? null;
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});

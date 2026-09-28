import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import type { ScreenState } from "../shared/contracts";
import { AgentChat } from "./features/agent/AgentChat";
import { PedidosPage } from "./features/pedidos/PedidosPage";
import { useChangeEvents } from "./lib/use-change-events";
import { DEV_USERS, useSession } from "./lib/session";

export function App() {
  const { userId, setUserId } = useSession();
  const queryClient = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  useChangeEvents();

  // Estado da tela que o agente recebe. Ref: o chat lê o valor atual no envio,
  // sem remontar a cada clique na tabela.
  const screen = useRef<ScreenState>({ rota: "pedidos" });
  screen.current = { rota: "pedidos", pedidoSelecionado: selecionado };

  const trocarUsuario = (id: string) => {
    queryClient.clear(); // nada em cache de um usuário vaza para o outro
    setSelecionado(null);
    setUserId(id);
  };

  return (
    <div className="shell">
      <nav className="topbar">
        <strong>Exemplo 4 · AI SDK</strong>
        <label>
          Usuário{" "}
          <select value={userId} onChange={(e) => trocarUsuario(e.target.value)}>
            {DEV_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </nav>
      {/* key: trocar de usuário remonta tudo (tela e conversa) do zero. */}
      <main className="content" key={userId}>
        <PedidosPage selecionado={selecionado} onSelecionar={setSelecionado} />
        <AgentChat getScreen={() => screen.current} />
      </main>
    </div>
  );
}

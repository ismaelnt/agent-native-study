// A mesma tela dos exemplos 1 e 2 (shared/ui.html), agora em React. O chat do
// agente NÃO fica nesta página: é o AgentSidebar do Layout (AgentInspector),
// o mesmo agente, com as mesmas actions, em todas as telas do app.
//
// Compare com shared/ui.ts:
// - lá: fetch("/actions/cancelarPedido") escrito à mão + refresh manual da tabela
// - aqui: useActionMutation("cancelar-pedido"), tipado a partir da action, e a
//   tabela se atualiza sozinha quando o AGENTE muda o banco (useDbSync no root).
import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router";

export function meta() {
  return [{ title: "Pedidos" }];
}

const STATUS_CLASSE: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  pago: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  enviado: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelado: "bg-muted text-muted-foreground line-through",
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selecionado = searchParams.get("selecionado");
  const [erro, setErro] = useState<string | null>(null);

  const { data: pedidos = [], isLoading } = useActionQuery("listar-pedidos", {});
  const cancelar = useActionMutation("cancelar-pedido", {
    onSuccess: () => setErro(null),
    // Mesma mensagem que o agente recebe quando tenta cancelar o 1003.
    onError: (e) => setErro(actionErrorMessage(e) ?? "Falha ao cancelar"),
  });
  const resetar = useActionMutation("resetar-pedidos", {
    onSuccess: () => setErro(null),
    onError: (e) => setErro(actionErrorMessage(e) ?? "Falha ao restaurar"),
  });
  const cancelandoId = cancelar.isPending
    ? cancelar.variables?.pedidoId
    : undefined;
  const pedidoSelecionado = pedidos.find((p) => p.id === selecionado);

  // A seleção fica na URL (?selecionado=1004). O use-navigation-state.ts
  // copia isso para o application_state, que o agente lê.
  function selecionar(id: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!id || id === selecionado) params.delete("selecionado");
    else params.set("selecionado", id);
    setSearchParams(params, { replace: true });
    setErro(null);
  }

  function pedirAoAgente() {
    sendToAgentChat({
      message: "Cancela o pedido selecionado",
      submit: true,
      openSidebar: true,
    });
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* O título "Pedidos" já vem do Header (Layout). */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Marque um pedido e peça ao agente no chat ao lado: "cancela esse".
        </p>
        <button
          type="button"
          disabled={resetar.isPending}
          onClick={() => resetar.mutate({})}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {resetar.isPending ? "Restaurando…" : "Restaurar exemplo"}
        </button>
      </div>

      {erro ? (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => setErro(null)}
            aria-label="Fechar"
            className="text-destructive/70 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      ) : null}

      {pedidoSelecionado ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span>
            Pedido <span className="font-mono">{pedidoSelecionado.id}</span> (
            {pedidoSelecionado.cliente}) selecionado. O agente já sabe qual é.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pedirAoAgente}
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            >
              Pedir ao agente para cancelar
            </button>
            <button
              type="button"
              onClick={() => selecionar(null)}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="w-8 py-2">
                <span className="sr-only">Selecionar</span>
              </th>
              <th>Id</th>
              <th>Cliente</th>
              <th className="text-right">Valor</th>
              <th className="ps-6">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const marcado = p.id === selecionado;
              return (
                <tr
                  key={p.id}
                  onClick={() => selecionar(p.id)}
                  aria-selected={marcado}
                  className={`cursor-pointer border-b border-border ${
                    marcado ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => selecionar(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Selecionar pedido ${p.id}`}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="font-mono">{p.id}</td>
                  <td>{p.cliente}</td>
                  <td className="text-right tabular-nums">
                    {brl.format(p.valor)}
                  </td>
                  <td className="ps-6">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_CLASSE[p.status] ?? "bg-muted"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-1 text-right">
                    {/* Sem regra de status aqui de propósito: quem decide é a
                        action, e o erro dela aparece no banner acima. */}
                    <button
                      type="button"
                      disabled={cancelar.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Cancelar o pedido ${p.id}?`)) {
                          cancelar.mutate({ pedidoId: p.id });
                        }
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      {cancelandoId === p.id ? "Cancelando…" : "Cancelar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

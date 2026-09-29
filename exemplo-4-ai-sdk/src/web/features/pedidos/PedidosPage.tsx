import { useActionMutation, useActionQuery, useMe } from "../../lib/api";

interface Props {
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
}

export function PedidosPage({ selecionado, onSelecionar }: Props) {
  const pedidos = useActionQuery("pedidos_listar", {});
  const cancelar = useActionMutation("pedidos_cancelar");
  const restaurar = useActionMutation("pedidos_restaurar");
  const me = useMe();

  // A UI esconde o que o usuário não pode fazer, mas quem GARANTE é o servidor:
  // chamar a action direto (ou pedir ao agente) dá o mesmo "sem permissão".
  const podeCancelar = me.data?.actions.includes("pedidos_cancelar") ?? false;
  const podeRestaurar = me.data?.actions.includes("pedidos_restaurar") ?? false;

  return (
    <section className="pedidos">
      <header className="pedidos-header">
        <div>
          <h1>Pedidos</h1>
          <p className="muted">Clique numa linha para selecionar. Depois peça ao agente: “cancela esse”.</p>
        </div>
        {podeRestaurar ? (
          <button
            type="button"
            disabled={restaurar.isPending}
            onClick={() => {
              cancelar.reset();
              restaurar.mutate({});
            }}
          >
            {restaurar.isPending ? "Restaurando…" : "Restaurar exemplo"}
          </button>
        ) : null}
      </header>

      {cancelar.error ? <div className="alert">{cancelar.error.message}</div> : null}
      {restaurar.error ? <div className="alert">{restaurar.error.message}</div> : null}
      {pedidos.error ? <div className="alert">{pedidos.error.message}</div> : null}

      {pedidos.isPending ? (
        <p className="muted">Carregando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Cliente</th>
              <th className="num">Valor</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pedidos.data?.map((p) => (
              <tr
                key={p.id}
                aria-selected={p.id === selecionado}
                onClick={() => onSelecionar(p.id === selecionado ? null : p.id)}
              >
                <td className="mono">{p.id}</td>
                <td>{p.cliente}</td>
                <td className="num">{p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td>
                  <span className={`status status-${p.status}`}>{p.status}</span>
                </td>
                <td className="num">
                  <button
                    type="button"
                    disabled={!podeCancelar || cancelar.isPending}
                    title={podeCancelar ? undefined : "Sem permissão para cancelar"}
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelar.mutate({ pedidoId: p.id });
                    }}
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

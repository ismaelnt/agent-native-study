import type { Db, Migration } from "../../infra/db";

export type StatusPedido = "pendente" | "pago" | "enviado" | "cancelado";

export interface Pedido {
  id: string;
  cliente: string;
  valor: number;
  status: StatusPedido;
}

/**
 * O domínio depende desta interface, não do banco. Testes usam SQLite em
 * memória; produção poderia usar Postgres, uma API legada, etc.
 */
export interface PedidosRepository {
  listar(): Promise<Pedido[]>;
  buscar(id: string): Promise<Pedido | null>;
  atualizarStatus(id: string, status: StatusPedido): Promise<Pedido>;
  /** Volta a tabela para os pedidos de exemplo (só para repetir a demo). */
  restaurar(): Promise<Pedido[]>;
}

/** Mesmos dados da migração pedidos-002-seed (que não pode mudar depois de aplicada). */
export const PEDIDOS_INICIAIS: readonly Pedido[] = [
  { id: "1001", cliente: "Ana", valor: 129.9, status: "pendente" },
  { id: "1002", cliente: "Bruno", valor: 89.5, status: "pago" },
  { id: "1003", cliente: "Carla", valor: 249.0, status: "enviado" },
  { id: "1004", cliente: "Diego", valor: 59.9, status: "pendente" },
];

export const pedidosMigrations: Migration[] = [
  {
    id: "pedidos-001-tabela",
    sql: `CREATE TABLE pedidos (
      id TEXT PRIMARY KEY,
      cliente TEXT NOT NULL,
      valor REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pendente','pago','enviado','cancelado'))
    )`,
  },
  {
    id: "pedidos-002-seed",
    sql: `INSERT INTO pedidos (id, cliente, valor, status) VALUES
      ('1001', 'Ana',   129.9, 'pendente'),
      ('1002', 'Bruno',  89.5, 'pago'),
      ('1003', 'Carla', 249.0, 'enviado'),
      ('1004', 'Diego',  59.9, 'pendente')`,
  },
];

export function createSqlitePedidosRepository(db: Db): PedidosRepository {
  const toPedido = (row: Record<string, unknown>): Pedido => ({
    id: String(row.id),
    cliente: String(row.cliente),
    valor: Number(row.valor),
    status: row.status as StatusPedido,
  });

  const listar = db.prepare("SELECT id, cliente, valor, status FROM pedidos ORDER BY id");
  const buscar = db.prepare("SELECT id, cliente, valor, status FROM pedidos WHERE id = ?");
  const atualizar = db.prepare("UPDATE pedidos SET status = ? WHERE id = ? RETURNING id, cliente, valor, status");
  const inserir = db.prepare("INSERT INTO pedidos (id, cliente, valor, status) VALUES (?, ?, ?, ?)");

  return {
    async listar() {
      return listar.all().map(toPedido);
    },
    async buscar(id) {
      const row = buscar.get(id);
      return row ? toPedido(row) : null;
    },
    async atualizarStatus(id, status) {
      const row = atualizar.get(status, id);
      if (!row) throw new Error(`Pedido ${id} sumiu durante a atualização`);
      return toPedido(row);
    },
    async restaurar() {
      db.exec("BEGIN");
      try {
        db.exec("DELETE FROM pedidos");
        for (const p of PEDIDOS_INICIAIS) inserir.run(p.id, p.cliente, p.valor, p.status);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return listar.all().map(toPedido);
    },
  };
}

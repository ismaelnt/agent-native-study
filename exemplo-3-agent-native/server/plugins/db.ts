// Cria a tabela de pedidos e popula com os mesmos 4 pedidos dos exemplos 1 e 2.
import { runMigrations } from "@agent-native/core/db";

export default runMigrations(
  [
    {
      version: 1,
      name: "pedidos-table",
      sql: `CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        cliente TEXT NOT NULL,
        valor DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL
      )`,
    },
    {
      version: 2,
      name: "pedidos-seed",
      sql: `INSERT INTO pedidos (id, cliente, valor, status) VALUES
        ('1001', 'Ana',   129.9, 'pendente'),
        ('1002', 'Bruno',  89.5, 'pago'),
        ('1003', 'Carla', 249.0, 'enviado'),
        ('1004', 'Diego',  59.9, 'pendente')
      ON CONFLICT (id) DO NOTHING`,
    },
  ],
  { table: "pedidos_migrations" },
);

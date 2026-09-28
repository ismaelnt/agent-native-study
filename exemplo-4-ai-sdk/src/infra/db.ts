import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite embutido no Node (node:sqlite): zero dependência nativa para o estudo.
 * Os repositórios dependem de interfaces, então trocar por Postgres em produção
 * significa escrever novas implementações de repositório, não mexer em actions.
 */
export type Db = DatabaseSync;

export interface Migration {
  /** Id único e estável, com prefixo do módulo: "pedidos-001-tabela". Nunca renomeie. */
  id: string;
  sql: string;
}

export function openDatabase(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  return db;
}

/** Aplica cada migração uma única vez, em ordem, dentro de uma transação. */
export function runMigrations(db: Db, migrations: readonly Migration[]) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((row) => String(row.id)),
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
      console.log(JSON.stringify({ level: "info", event: "db.migration", id: migration.id }));
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

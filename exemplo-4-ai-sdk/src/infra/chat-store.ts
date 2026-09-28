import type { UIMessage } from "ai";

import { ActionError } from "../core/errors";
import type { Db, Migration } from "./db";

/**
 * Conversas persistidas no servidor. O navegador manda só a mensagem nova;
 * o histórico vem daqui. Isso evita que o cliente reescreva o passado da
 * conversa e mantém o payload pequeno em conversas longas.
 */
export interface ChatStore {
  /** Retorna [] para conversa nova. Recusa conversa de outro usuário. */
  load(chatId: string, ownerId: string): Promise<UIMessage[]>;
  save(chatId: string, ownerId: string, messages: UIMessage[]): Promise<void>;
}

export const chatMigrations: Migration[] = [
  {
    id: "chat-001-tabela",
    sql: `CREATE TABLE chats (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      messages TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX chats_owner ON chats(owner_id, updated_at)`,
  },
];

export function createSqliteChatStore(db: Db): ChatStore {
  const select = db.prepare("SELECT owner_id, messages FROM chats WHERE id = ?");
  const upsert = db.prepare(`
    INSERT INTO chats (id, owner_id, messages, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at
    WHERE chats.owner_id = excluded.owner_id`);

  return {
    async load(chatId, ownerId) {
      const row = select.get(chatId);
      if (!row) return [];
      if (row.owner_id !== ownerId) {
        throw new ActionError("Conversa pertence a outro usuário", "sem_permissao");
      }
      return JSON.parse(String(row.messages)) as UIMessage[];
    },
    async save(chatId, ownerId, messages) {
      upsert.run(chatId, ownerId, JSON.stringify(messages), new Date().toISOString());
    },
  };
}

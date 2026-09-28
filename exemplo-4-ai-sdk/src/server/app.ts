import express from "express";

import { appMigrations, buildModules } from "../app/modules";
import { createInMemoryChangeBus } from "../core/events";
import { consoleLogger, createActionRegistry } from "../core/registry";
import { chatMigrations, createSqliteChatStore } from "../infra/chat-store";
import { openDatabase, runMigrations } from "../infra/db";
import { createSqlitePedidosRepository } from "../modules/pedidos/pedidos.repository";
import { createChatRouter } from "./agent/chat.router";
import { createModel } from "./agent/model";
import { devAuth } from "./auth";
import type { Config } from "./config";
import { createActionsRouter } from "./http/actions.router";
import { errorHandler } from "./http/errors";
import { createEventsRouter } from "./http/events.router";

/**
 * Raiz de composição: o ÚNICO lugar que conhece as implementações concretas
 * (SQLite, Ollama, Express) e as conecta. O resto do código só vê interfaces.
 */
export function createServices(config: Config) {
  const db = openDatabase(config.DATABASE_PATH);
  runMigrations(db, [...appMigrations, ...chatMigrations]);

  const bus = createInMemoryChangeBus();
  const registry = createActionRegistry({
    modules: buildModules({ pedidosRepo: createSqlitePedidosRepository(db) }),
    bus,
    logger: consoleLogger,
  });

  return { db, bus, registry, chatStore: createSqliteChatStore(db), model: createModel(config) };
}

export function createApi(config: Config, services: ReturnType<typeof createServices>) {
  const api = express.Router();
  api.use(express.json({ limit: "1mb" }));
  api.use(devAuth);
  api.use(createActionsRouter({ registry: services.registry }));
  api.use(createEventsRouter({ bus: services.bus }));
  api.use(
    createChatRouter({
      registry: services.registry,
      chatStore: services.chatStore,
      model: services.model,
      maxSteps: config.AI_MAX_STEPS,
    }),
  );
  api.use(errorHandler);
  return api;
}

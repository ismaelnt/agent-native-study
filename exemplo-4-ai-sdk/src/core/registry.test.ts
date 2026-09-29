import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { appMigrations, buildModules } from "../app/modules";
import { openDatabase, runMigrations } from "../infra/db";
import { createSqlitePedidosRepository } from "../modules/pedidos/pedidos.repository";
import { buildAgentTools } from "../server/agent/tools";
import type { ActionContext, Actor } from "./action";
import { ActionError, ERRO_INTERNO } from "./errors";
import { createInMemoryChangeBus, type ChangeEvent } from "./events";
import { createActionRegistry, type Logger } from "./registry";

const gerente: Actor = {
  id: "gerente",
  nome: "Gerente",
  permissoes: ["pedidos:ler", "pedidos:cancelar", "pedidos:restaurar"],
};
const estagiario: Actor = { id: "estagiario", nome: "Estagiário", permissoes: ["pedidos:ler"] };
const ctx = (actor: Actor): ActionContext => ({ actor, origin: "teste", requestId: "t" });
const silentLogger: Logger = { info() {}, error() {} };

function setup() {
  const db = openDatabase(":memory:");
  runMigrations(db, appMigrations);
  const bus = createInMemoryChangeBus();
  const events: ChangeEvent[] = [];
  bus.subscribe((e) => events.push(e));
  const registry = createActionRegistry({
    modules: buildModules({ pedidosRepo: createSqlitePedidosRepository(db) }),
    bus,
    logger: silentLogger,
  });
  return { registry, events };
}

describe("registry", () => {
  let app: ReturnType<typeof setup>;
  beforeEach(() => {
    app = setup();
  });

  it("aplica a regra de negócio (pedido enviado não cancela)", async () => {
    await assert.rejects(app.registry.execute("pedidos_cancelar", { pedidoId: "1003" }, ctx(gerente)), {
      name: "ActionError",
      code: "regra_de_negocio",
    });
  });

  it("cancela e publica evento de mudança", async () => {
    const out = await app.registry.execute("pedidos_cancelar", { pedidoId: "1004" }, ctx(gerente));
    assert.equal((out as { status: string }).status, "cancelado");
    assert.equal(app.events.length, 1);
    assert.equal(app.events[0]?.resource, "pedidos");
  });

  it("restaura os pedidos de exemplo depois de cancelar", async () => {
    await app.registry.execute("pedidos_cancelar", { pedidoId: "1004" }, ctx(gerente));
    const out = (await app.registry.execute("pedidos_restaurar", {}, ctx(gerente))) as { id: string; status: string }[];
    assert.equal(out.find((p) => p.id === "1004")?.status, "pendente");
    assert.equal(out.length, 4);
    await assert.rejects(app.registry.execute("pedidos_restaurar", {}, ctx(estagiario)), { code: "sem_permissao" });
  });

  it("não publica evento em action de leitura", async () => {
    await app.registry.execute("pedidos_listar", {}, ctx(gerente));
    assert.equal(app.events.length, 0);
  });

  it("valida a entrada pelo schema", async () => {
    await assert.rejects(app.registry.execute("pedidos_cancelar", {}, ctx(gerente)), {
      code: "entrada_invalida",
    });
  });

  it("recusa sem permissão, qualquer que seja a origem", async () => {
    for (const origin of ["ui", "agente", "http"] as const) {
      await assert.rejects(
        app.registry.execute("pedidos_cancelar", { pedidoId: "1004" }, { ...ctx(estagiario), origin }),
        { code: "sem_permissao" },
      );
    }
  });

  it("esconde detalhes de erro inesperado", async () => {
    const bus = createInMemoryChangeBus();
    const registry = createActionRegistry({
      modules: [
        {
          name: "x",
          actions: [
            {
              name: "x_quebra",
              description: "",
              input: (await import("zod")).z.object({}),
              run: async () => {
                throw new Error("senha do banco: hunter2");
              },
            },
          ],
        },
      ],
      bus,
      logger: silentLogger,
    });
    await assert.rejects(registry.execute("x_quebra", {}, ctx(gerente)), (e: Error) => {
      assert.equal(e.message, ERRO_INTERNO);
      assert.ok(!(e instanceof ActionError));
      return true;
    });
  });

  it("falha no boot com action duplicada ou sem prefixo do módulo", () => {
    const bus = createInMemoryChangeBus();
    const [mod] = buildModules({ pedidosRepo: {} as never });
    assert.throws(
      () => createActionRegistry({ modules: [mod, mod], bus, logger: silentLogger }),
      /duplicada/,
    );
    assert.throws(
      () =>
        createActionRegistry({
          modules: [{ ...mod, name: "outro" }],
          bus,
          logger: silentLogger,
        }),
      /prefixo/,
    );
  });
});

describe("tools do agente", () => {
  // pedidos_restaurar tem agent: false, então não aparece nem para o gerente.
  it("o agente só recebe as tools que o usuário pode usar", () => {
    const { registry } = setup();
    assert.deepEqual(Object.keys(buildAgentTools(registry, ctx(gerente))).sort(), [
      "pedidos_buscar",
      "pedidos_cancelar",
      "pedidos_listar",
    ]);
    assert.deepEqual(Object.keys(buildAgentTools(registry, ctx(estagiario))).sort(), [
      "pedidos_buscar",
      "pedidos_listar",
    ]);
  });
});

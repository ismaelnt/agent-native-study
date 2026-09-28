import { Router } from "express";

import type { ActionRegistry } from "../../core/registry";
import type { Me } from "../../shared/contracts";
import { actorOf } from "../auth";

/**
 * Superfície HTTP: UMA rota genérica para todas as actions (estilo RPC).
 * Uma action nova aparece aqui sem ninguém escrever rota.
 */
export function createActionsRouter({ registry }: { registry: ActionRegistry }) {
  const router = Router();

  router.get("/me", (_req, res) => {
    const actor = actorOf(res);
    const me: Me = {
      id: actor.id,
      nome: actor.nome,
      actions: registry.listFor(actor).map((a) => a.name),
    };
    res.json(me);
  });

  router.post("/actions/:name", async (req, res, next) => {
    try {
      const output = await registry.execute(req.params.name, req.body, {
        actor: actorOf(res),
        origin: req.header("x-client") === "web" ? "ui" : "http",
        requestId: res.locals.requestId,
      });
      res.json(output ?? null);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

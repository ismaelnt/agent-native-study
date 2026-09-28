import type { NextFunction, Request, Response } from "express";

import type { Actor } from "../core/action";
import { DEV_USER_HEADER } from "../shared/contracts";

/**
 * Autenticação de MENTIRA, só para o estudo: o usuário vem de um cabeçalho.
 * Em produção, este middleware valida sessão/JWT e monta o mesmo `Actor`.
 * Nada além deste arquivo precisa mudar, porque o resto só conhece `Actor`.
 */
const DEV_USERS: Record<string, Actor> = {
  gerente: { id: "gerente", nome: "Gerente", permissoes: ["pedidos:ler", "pedidos:cancelar"] },
  estagiario: { id: "estagiario", nome: "Estagiário", permissoes: ["pedidos:ler"] },
};

export const DEV_USER_IDS = Object.keys(DEV_USERS);

export function devAuth(req: Request, res: Response, next: NextFunction) {
  const id = req.header(DEV_USER_HEADER) ?? "gerente";
  const actor = DEV_USERS[id];
  if (!actor) {
    res.status(401).json({ error: { code: "nao_autenticado", message: "Usuário desconhecido" } });
    return;
  }
  res.locals.actor = actor;
  res.locals.requestId = crypto.randomUUID();
  next();
}

export function actorOf(res: Response): Actor {
  return res.locals.actor as Actor;
}

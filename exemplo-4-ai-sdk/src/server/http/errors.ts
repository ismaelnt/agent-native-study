import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { ActionError, ERRO_INTERNO } from "../../core/errors";
import type { ApiErrorBody } from "../../shared/contracts";

/** Tradução única de erro → HTTP. Nenhuma rota monta resposta de erro sozinha. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody = { error: { code: "erro_interno", message: ERRO_INTERNO } };

  if (error instanceof ActionError) {
    status = error.status;
    body = { error: { code: error.code, message: error.message } };
  } else if (error instanceof ZodError) {
    status = 400;
    body = { error: { code: "requisicao_invalida", message: "Requisição inválida" } };
  } else if (!(error instanceof Error && error.message === ERRO_INTERNO)) {
    // Erros já logados pelo registry chegam como ERRO_INTERNO; o resto logamos aqui.
    console.error(JSON.stringify({ level: "error", event: "http.erro", requestId: res.locals.requestId, error: String(error) }));
  }

  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(status).json(body);
};

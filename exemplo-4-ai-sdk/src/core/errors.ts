/**
 * Erro "esperado" de uma action: regra de negócio, permissão, não encontrado.
 * A mensagem é segura para mostrar a quem chamou (usuário na UI ou agente).
 *
 * Qualquer outro erro (bug, banco fora do ar) é tratado como interno: é logado
 * no servidor e quem chamou recebe só uma mensagem genérica.
 */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly code: ActionErrorCode,
    readonly status: number = STATUS_BY_CODE[code],
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export type ActionErrorCode =
  | "entrada_invalida"
  | "nao_encontrado"
  | "sem_permissao"
  | "regra_de_negocio"
  | "action_desconhecida";

const STATUS_BY_CODE: Record<ActionErrorCode, number> = {
  entrada_invalida: 400,
  nao_encontrado: 404,
  sem_permissao: 403,
  regra_de_negocio: 422,
  action_desconhecida: 404,
};

export const ERRO_INTERNO = "Erro interno. Tente novamente em instantes.";

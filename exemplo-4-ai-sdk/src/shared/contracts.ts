/**
 * Contratos compartilhados entre servidor e navegador. Só zod e tipos:
 * nada aqui pode importar código de servidor (banco, AI SDK, Express).
 */
import { z } from "zod";

/**
 * O que o usuário está vendo. Vem do NAVEGADOR, então é entrada não confiável:
 * o schema limita formato e tamanho para que isto não vire um vetor de
 * prompt injection quando for colocado nas instruções do agente.
 */
export const ScreenStateSchema = z.object({
  rota: z.enum(["pedidos"]),
  pedidoSelecionado: z.string().regex(/^\d{1,10}$/).nullable().optional(),
});
export type ScreenState = z.infer<typeof ScreenStateSchema>;

export const ChatIdSchema = z.string().regex(/^chat_[A-Za-z0-9-]{8,64}$/);

export interface Me {
  id: string;
  nome: string;
  /** Actions que este usuário pode executar: a UI usa para mostrar/esconder controles. */
  actions: string[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

/** Cabeçalho de identidade do modo dev. Em produção: cookie de sessão/JWT. */
export const DEV_USER_HEADER = "x-dev-user";

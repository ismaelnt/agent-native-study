/**
 * Cliente tipado das actions. Os tipos vêm DIRETO das definições no servidor
 * (import type: nada de código de servidor entra no bundle do navegador).
 *
 *   callAction("pedidos_cancelar", { pedidoId: "1004" })
 *              ^ autocomplete          ^ checado pelo zod da action
 *
 * Renomeou um campo na action? O TypeScript aponta cada chamada quebrada na UI.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppAction, AppActionName } from "../../app/modules";
import type { ActionByName, ActionInput, ActionOutput } from "../../core/action";
import { DEV_USER_HEADER, type ApiErrorBody, type Me } from "../../shared/contracts";
import { useSession } from "./session";

type InputOf<N extends AppActionName> = ActionInput<ActionByName<AppAction, N>>;
type OutputOf<N extends AppActionName> = ActionOutput<ActionByName<AppAction, N>>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Convenção: o prefixo da action é o módulo, que é também o "recurso" dos eventos. */
export const resourceOf = (name: string) => name.split("_")[0]!;

async function request<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-client": "web", [DEV_USER_HEADER]: userId, ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error.message ?? `Erro ${res.status}`, body?.error.code ?? "desconhecido", res.status);
  }
  return (await res.json()) as T;
}

export function callAction<N extends AppActionName>(name: N, input: InputOf<N>, userId: string) {
  return request<OutputOf<N>>(`/actions/${name}`, userId, { method: "POST", body: JSON.stringify(input) });
}

export function useActionQuery<N extends AppActionName>(name: N, input: InputOf<N>) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [resourceOf(name), name, input],
    queryFn: () => callAction(name, input, userId),
  });
}

export function useActionMutation<N extends AppActionName>(name: N) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InputOf<N>) => callAction(name, input, userId),
    // O evento SSE também invalida; isto só deixa a própria aba mais rápida.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceOf(name)] }),
  });
}

export function useMe() {
  const { userId } = useSession();
  return useQuery({ queryKey: ["me", userId], queryFn: () => request<Me>("/me", userId) });
}

export function fetchChatHistory(chatId: string, userId: string) {
  return request<unknown[]>(`/chats/${chatId}`, userId);
}

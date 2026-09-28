import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { ChangeEvent } from "../../core/events";

/**
 * Escuta "o recurso X mudou" e invalida as queries daquele recurso.
 * É isto que faz a tabela atualizar quando o AGENTE cancela um pedido,
 * sem a tela saber que existe um agente.
 */
export function useChangeEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as ChangeEvent;
      void queryClient.invalidateQueries({ queryKey: [event.resource] });
    };
    // EventSource reconecta sozinho; ao voltar, recarrega tudo que pode ter mudado.
    source.onopen = () => void queryClient.invalidateQueries();
    return () => source.close();
  }, [queryClient]);
}

/**
 * Evento de mudança: "o recurso X mudou". A UI usa para invalidar caches,
 * não importa QUEM mudou (a própria UI, o agente, outro usuário, um job).
 */
export interface ChangeEvent {
  resource: string;
  action: string;
  actorId: string;
  origin: string;
  at: string;
}

export interface ChangeBus {
  publish(event: ChangeEvent): void;
  subscribe(listener: (event: ChangeEvent) => void): () => void;
}

/**
 * Implementação em memória: funciona com UMA instância do servidor.
 * Com várias instâncias atrás de um load balancer, troque por Redis pub/sub,
 * Postgres LISTEN/NOTIFY ou similar. A interface não muda.
 */
export function createInMemoryChangeBus(): ChangeBus {
  const listeners = new Set<(event: ChangeEvent) => void>();
  return {
    publish(event) {
      for (const listener of listeners) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

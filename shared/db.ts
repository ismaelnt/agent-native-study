// "Banco" em memória compartilhado pela UI e pelo agente dentro de cada servidor.
export type StatusPedido = "pendente" | "pago" | "enviado" | "cancelado";

export interface Pedido {
  id: string;
  cliente: string;
  valor: number;
  status: StatusPedido;
}

export const db: { pedidos: Pedido[] } = {
  pedidos: [
    { id: "1001", cliente: "Ana", valor: 129.9, status: "pendente" },
    { id: "1002", cliente: "Bruno", valor: 89.5, status: "pago" },
    { id: "1003", cliente: "Carla", valor: 249.0, status: "enviado" },
    { id: "1004", cliente: "Diego", valor: 59.9, status: "pendente" },
  ],
};

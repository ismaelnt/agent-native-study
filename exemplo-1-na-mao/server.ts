/**
 * EXEMPLO 1 — "Do jeito comum": UI e agente com caminhos SEPARADOS.
 *
 *   UI  ──► rotas REST (/pedidos/...)  ──► lógica A
 *   Chat ──► tools definidas à mão      ──► lógica B (reescrita)
 *
 * Repare em três problemas clássicos marcados com ⚠️ ao longo do arquivo.
 */
import express from "express";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "../shared/db.js";
import { rodarAgente } from "../shared/agent-loop.js";
import { servirUI } from "../shared/ui.js";

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// Caminho 1: a API que a UI usa
// ─────────────────────────────────────────────
app.get("/pedidos", (_req, res) => {
  res.json(db.pedidos);
});

app.post("/pedidos/:id/cancelar", (req, res) => {
  const pedido = db.pedidos.find((p) => p.id === req.params.id);
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado" });

  // Regra de negócio: não dá pra cancelar pedido já enviado ou já cancelado
  if (pedido.status === "enviado" || pedido.status === "cancelado") {
    return res.status(400).json({ erro: `Pedido ${pedido.id} está "${pedido.status}" e não pode ser cancelado` });
  }
  pedido.status = "cancelado";
  res.json(pedido);
});

// ─────────────────────────────────────────────
// Caminho 2: as tools do agente, escritas À MÃO
// ─────────────────────────────────────────────

// ⚠️ Problema 1: o contrato (nome, descrição, parâmetros) é mantido duas vezes.
//    Se a rota ganhar um parâmetro novo, alguém precisa lembrar de atualizar aqui.
const tools: Anthropic.Tool[] = [
  {
    name: "listar_pedidos",
    description: "Lista todos os pedidos da loja com id, cliente, valor e status",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "cancelar_pedido",
    description: "Cancela um pedido pelo id",
    input_schema: {
      type: "object",
      properties: { pedidoId: { type: "string", description: "Id do pedido" } },
      required: ["pedidoId"],
    },
  },
];

async function executarTool(nome: string, input: any) {
  switch (nome) {
    case "listar_pedidos":
      return db.pedidos;

    case "cancelar_pedido": {
      const pedido = db.pedidos.find((p) => p.id === input.pedidoId);
      if (!pedido) throw new Error("Pedido não encontrado");

      // ⚠️ Problema 2 (BUG PROPOSITAL): a lógica foi reescrita e alguém esqueceu
      //    a regra de "enviado". Pela UI é impossível cancelar o pedido 1003;
      //    pelo agente, funciona. Esse é o tipo de divergência que acontece
      //    de verdade quando existem dois caminhos.
      pedido.status = "cancelado";
      return pedido;
    }

    default:
      throw new Error(`Tool desconhecida: ${nome}`);
  }
}

app.post("/chat", async (req, res) => {
  // ⚠️ Problema 3: o agente não sabe o que o usuário está vendo na tela.
  //    A UI até manda `tela`, mas este servidor ignora. "Cancela esse" não funciona.
  const { mensagem } = req.body;
  try {
    const resultado = await rodarAgente({
      mensagem,
      system: "Você é o assistente do painel de pedidos de uma loja. Responda em português, de forma curta.",
      tools,
      executar: executarTool,
    });
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : String(e) });
  }
});

servirUI(app, "exemplo-1");
app.listen(3001, () => console.log("Exemplo 1 (na mão) em http://localhost:3001"));

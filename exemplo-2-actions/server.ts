/**
 * EXEMPLO 2 — "Estilo Agent-Native": UMA definição, várias superfícies.
 *
 *              ┌─► rota HTTP (usada pela UI)
 *   action ────┤
 *              └─► tool do agente (gerada automaticamente)
 *
 * Compare com o Exemplo 1: não existe nenhuma tool escrita à mão aqui.
 */
import express from "express";
import { actions } from "./actions.js";
import { actionParaTool, executarAction, type ActionContext } from "./define-action.js";
import { rodarAgente } from "../shared/agent-loop.js";
import { servirUI } from "../shared/ui.js";

const app = express();
app.use(express.json());

// Superfície 1: HTTP. Uma rota gerada para cada action.
for (const action of actions) {
  app.post(`/actions/${action.name}`, async (req, res) => {
    try {
      res.json(await executarAction(action, req.body ?? {}, { origem: "ui" }));
    } catch (e) {
      res.status(400).json({ erro: e instanceof Error ? e.message : String(e) });
    }
  });
}

// Superfície 2: agente. As tools saem das mesmas actions.
const tools = actions.map(actionParaTool);

app.post("/chat", async (req, res) => {
  const { mensagem, tela } = req.body;
  const ctx: ActionContext = { origem: "agente", tela };

  // Estado compartilhado: o agente sabe o que está selecionado na tela.
  const contextoTela = tela?.pedidoSelecionado
    ? `O usuário está com o pedido ${tela.pedidoSelecionado} selecionado na tela. "Esse", "este" ou "o selecionado" se referem a ele.`
    : "O usuário não tem nenhum pedido selecionado na tela.";

  try {
    const resultado = await rodarAgente({
      mensagem,
      system: `Você é o assistente do painel de pedidos de uma loja. Responda em português, de forma curta.\n${contextoTela}`,
      tools,
      executar: async (nome, input) => {
        const action = actions.find((a) => a.name === nome);
        if (!action) throw new Error(`Action desconhecida: ${nome}`);
        return executarAction(action, input, ctx); // mesmo caminho da UI
      },
    });
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ erro: e instanceof Error ? e.message : String(e) });
  }
});

servirUI(app, "exemplo-2");
app.listen(3002, () => console.log("Exemplo 2 (actions) em http://localhost:3002"));

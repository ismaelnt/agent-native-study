import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";

// Tools que o modelo já recebe na primeira chamada. As demais actions ficam
// disponíveis via tool-search. Nenhuma tool é escrita à mão: todas saem de actions/.
const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "listar-pedidos",
  "cancelar-pedido",
];

export default createAgentChatPlugin({
  appId: "exemplo-3-agent-native",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `Você é o assistente do painel de pedidos de uma loja. Responda em português, de forma curta.
Quando o usuário disser "esse", "este" ou "o selecionado", use o pedidoSelecionado da tela atual (<current-screen> ou view-screen).

You are the Chat app agent.

This is a minimal chat-first Agent-Native app. The chat is the product surface, and actions are the contract shared by chat, UI, HTTP, MCP, A2A, and CLI.

Use actions as the source of truth. Start by inspecting the current screen when context matters. When the user asks to extend this app, keep the change small and agent-native: add or update actions, expose useful UI, and keep application state/navigation visible to the agent.`,
});

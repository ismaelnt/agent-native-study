import {
  AgentSidebar,
  focusAgentChat,
  navigateWithAgentChatViewTransition,
} from "@agent-native/core/client/agent-chat";
import { useT } from "@agent-native/core/client/i18n";
import { type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { TAB_ID } from "@/lib/tab-id";

interface AgentInspectorProps {
  children: ReactNode;
  chatHomeHandoffActive: boolean;
  chatHomeHandoffPending: boolean;
}

/** Contextual inspector shell used on secondary chat routes. */
export function AgentInspector({
  children,
  chatHomeHandoffActive,
  chatHomeHandoffPending,
}: AgentInspectorProps) {
  const navigate = useNavigate();
  const t = useT();
  const { pathname } = useLocation();
  const naTelaDePedidos = pathname.startsWith("/pedidos");

  function openAskAgentFullscreen() {
    focusAgentChat();
    navigateWithAgentChatViewTransition(navigate, "/home");
  }

  return (
    <AgentSidebar
      position="right"
      chatViewTransition
      chatViewTransitionHandoff={chatHomeHandoffPending}
      storageKey="chat"
      browserTabId={TAB_ID}
      openOnChatRunning={chatHomeHandoffActive}
      onFullscreenRequest={openAskAgentFullscreen}
      emptyStateText={
        naTelaDePedidos
          ? "Selecione um pedido e peça: \"cancela esse\"."
          : t("chat.inspectEmptyState")
      }
      agentPageHref="/settings/agent"
      suggestions={
        naTelaDePedidos
          ? [
              "Cancela o pedido selecionado",
              "Quais pedidos ainda podem ser cancelados?",
              "Resuma os pedidos por status",
            ]
          : [
              t("chat.inspectSuggestionCapabilities"),
              t("chat.inspectSuggestionHello"),
              t("chat.inspectSuggestionAction"),
            ]
      }
    >
      {children}
    </AgentSidebar>
  );
}

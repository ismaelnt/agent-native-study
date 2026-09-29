import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { DEV_USER_HEADER, type ScreenState } from "../../../shared/contracts";
import { fetchChatHistory } from "../../lib/api";
import { useSession } from "../../lib/session";

interface Props {
  /** Função, não valor: o chat precisa da tela no MOMENTO do envio. */
  getScreen: () => ScreenState;
}

const chatKey = (userId: string) => `ex4.chat.${userId}`;
const newChatId = () => `chat_${crypto.randomUUID()}`;

function storedChatId(userId: string): string {
  try {
    const saved = localStorage.getItem(chatKey(userId));
    if (saved) return saved;
    const id = newChatId();
    localStorage.setItem(chatKey(userId), id);
    return id;
  } catch {
    return newChatId();
  }
}

/** Carrega o histórico salvo no servidor antes de montar o chat. */
export function AgentChat({ getScreen }: Props) {
  const { userId } = useSession();
  const [chatId, setChatId] = useState(() => storedChatId(userId));
  const history = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => fetchChatHistory(chatId, userId),
    staleTime: Infinity,
  });

  const novaConversa = () => {
    const id = newChatId();
    try {
      localStorage.setItem(chatKey(userId), id);
    } catch {
      // Sem storage: a conversa nova só não sobrevive ao reload.
    }
    setChatId(id);
  };

  return (
    <aside className="agent">
      <header>
        <strong>Agente</strong>
        <button type="button" className="ghost" onClick={novaConversa}>
          Nova conversa
        </button>
      </header>
      {/* Checa `data`, não isPending/error: um refetch em segundo plano que falhe
          não pode desmontar a conversa (e a resposta em andamento). */}
      {history.data === undefined && history.isPending ? (
        <p className="muted pad">Carregando conversa…</p>
      ) : history.data === undefined ? (
        <p className="alert">{history.error?.message ?? "Falha ao carregar a conversa"}</p>
      ) : (
        <ChatSession
          key={chatId}
          chatId={chatId}
          userId={userId}
          initialMessages={history.data as UIMessage[]}
          getScreen={getScreen}
        />
      )}
    </aside>
  );
}

function ChatSession(props: {
  chatId: string;
  userId: string;
  initialMessages: UIMessage[];
  getScreen: () => ScreenState;
}) {
  const [input, setInput] = useState("");
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { [DEV_USER_HEADER]: props.userId },
        // Manda só a mensagem nova + a tela. O servidor tem o histórico.
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: { id, message: messages.at(-1), screen: props.getScreen() },
        }),
      }),
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    id: props.chatId,
    messages: props.initialMessages,
    transport,
  });
  const busy = status === "submitted" || status === "streaming";

  // Modelos com "thinking" (ex.: qwen) passam um tempo raciocinando antes do
  // primeiro texto, e o raciocínio não é enviado (sendReasoning: false). Nesse
  // intervalo o status já é "streaming", mas não há nada para mostrar: mantém
  // o indicador até aparecer texto ou tool na última resposta.
  const ultima = messages.at(-1);
  const semConteudoAinda =
    ultima?.role !== "assistant" ||
    !ultima.parts.some((p) => (p.type === "text" && p.text.trim()) || isToolUIPart(p));
  const pensando = busy && semConteudoAinda;

  // Rola para o fim quando chega mensagem/pedaço novo.
  const fimRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pensando]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  };

  return (
    <>
      <div className="messages">
        {messages.length === 0 ? (
          <p className="muted">Ex.: “liste os pedidos”, “cancela o pedido 1003”, “cancela esse”.</p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={`msg msg-${m.role}`}>
            {m.parts.map((part, i) => {
              if (part.type === "text") return <p key={i}>{part.text}</p>;
              if (isToolUIPart(part)) return <ToolCall key={i} part={part} />;
              return null;
            })}
          </div>
        ))}
        {pensando ? <p className="muted">Pensando… (modelo local pode levar alguns minutos)</p> : null}
        {error ? <p className="alert">{error.message}</p> : null}
        <div ref={fimRef} />
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte ao agente…" />
        {busy ? (
          <button type="button" onClick={() => void stop()}>
            Parar
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            Enviar
          </button>
        )}
      </form>
    </>
  );
}

/** Mostra a chamada de tool: é aqui que se vê o agente usando as MESMAS actions da tela. */
function ToolCall({ part }: { part: Parameters<typeof getToolName>[0] }) {
  const name = getToolName(part);
  const args = "input" in part && part.input ? JSON.stringify(part.input) : "";
  return (
    <div className={`tool tool-${part.state}`}>
      <code>
        {name}({args})
      </code>
      {part.state === "output-error" ? <span> ↳ {part.errorText}</span> : null}
      {part.state === "output-available" ? <span> ✓</span> : null}
    </div>
  );
}

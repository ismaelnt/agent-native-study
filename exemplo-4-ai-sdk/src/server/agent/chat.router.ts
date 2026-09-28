import {
  convertToModelMessages,
  createIdGenerator,
  isStepCount,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type LanguageModel,
} from "ai";
import { Router } from "express";
import { z } from "zod";

import type { ActionContext } from "../../core/action";
import { ActionError, ERRO_INTERNO } from "../../core/errors";
import type { ActionRegistry } from "../../core/registry";
import type { ChatStore } from "../../infra/chat-store";
import { ChatIdSchema, ScreenStateSchema } from "../../shared/contracts";
import { actorOf } from "../auth";
import { buildInstructions } from "./instructions";
import { buildAgentTools } from "./tools";

const ChatRequestSchema = z.object({
  id: ChatIdSchema,
  /** Só a mensagem NOVA. O histórico vem do banco, não do cliente. */
  message: z.unknown(),
  screen: ScreenStateSchema,
});

export function createChatRouter(deps: {
  registry: ActionRegistry;
  chatStore: ChatStore;
  model: LanguageModel;
  maxSteps: number;
}) {
  const router = Router();

  router.get("/chats/:id", async (req, res, next) => {
    try {
      const id = ChatIdSchema.parse(req.params.id);
      res.json(await deps.chatStore.load(id, actorOf(res).id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/chat", async (req, res, next) => {
    try {
      const body = ChatRequestSchema.parse(req.body);
      const actor = actorOf(res);
      const ctx: ActionContext = { actor, origin: "agente", requestId: res.locals.requestId };

      // Histórico do servidor + mensagem nova, validados antes de ir ao modelo.
      const history = await deps.chatStore.load(body.id, actor.id);
      const messages = await validateUIMessages({ messages: [...history, body.message] });

      const tools = buildAgentTools(deps.registry, ctx);

      // Se o usuário fechar a aba, para de gastar tokens.
      const abort = new AbortController();
      res.on("close", () => {
        if (!res.writableFinished) abort.abort();
      });

      const result = streamText({
        model: deps.model,
        instructions: buildInstructions({ actor, screen: body.screen, modules: deps.registry.modules }),
        messages: await convertToModelMessages(messages),
        tools,
        // Limite de voltas do loop: protege contra o modelo ficar chamando tools para sempre.
        stopWhen: isStepCount(deps.maxSteps),
        abortSignal: abort.signal,
      });

      pipeUIMessageStreamToResponse({
        response: res,
        stream: toUIMessageStream({
          stream: result.stream,
          originalMessages: messages,
          // Ids gerados no servidor: estáveis para persistência.
          generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
          sendReasoning: false,
          onEnd: async ({ messages: finalMessages }) => {
            await deps.chatStore.save(body.id, actor.id, finalMessages);
          },
          // O que chega ao navegador: só mensagens seguras.
          onError: (error) =>
            error instanceof ActionError || (error instanceof Error && error.message === ERRO_INTERNO)
              ? error.message
              : ERRO_INTERNO,
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

import { Router } from "express";

import type { ChangeBus } from "../../core/events";

/**
 * Server-Sent Events: o servidor avisa "o recurso X mudou" e a UI recarrega
 * o que estiver mostrando. Funciona igual se quem mudou foi a própria UI,
 * o agente, outra aba ou outro usuário.
 */
export function createEventsRouter({ bus }: { bus: ChangeBus }) {
  const router = Router();

  router.get("/events", (req, res) => {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    res.write(": conectado\n\n");

    const unsubscribe = bus.subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    // Proxies costumam derrubar conexões ociosas; um comentário periódico mantém viva.
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}

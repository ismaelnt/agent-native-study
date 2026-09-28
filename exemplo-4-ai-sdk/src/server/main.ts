import path from "node:path";

import express from "express";

import { createApi, createServices } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
const services = createServices(config);

const app = express();
app.use("/api", createApi(config, services));

if (config.NODE_ENV === "production") {
  // Produção: front-end já compilado (`npm run build`).
  const dist = path.resolve("dist/web");
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  // Dev: Vite roda DENTRO do Express. Uma porta só, com hot reload no React.
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

const server = app.listen(config.PORT, () => {
  console.log(
    `Exemplo 4 (AI SDK) em http://localhost:${config.PORT}  ·  modelo: ${config.AI_PROVIDER}/${config.AI_MODEL}`,
  );
});

// Encerramento limpo: termina requisições em andamento e fecha o banco.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      services.db.close();
      process.exit(0);
    });
  });
}

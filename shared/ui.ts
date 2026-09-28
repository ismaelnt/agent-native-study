import { readFileSync } from "node:fs";
import type { Express } from "express";

const html = readFileSync(new URL("./ui.html", import.meta.url), "utf8");

/** Serve a mesma tela para os dois exemplos; só muda o "modo" (quais endpoints ela chama). */
export function servirUI(app: Express, modo: "exemplo-1" | "exemplo-2") {
  app.get("/", (_req, res) => res.type("html").send(html.replace("__MODO__", modo)));
}

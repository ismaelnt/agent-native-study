# Exemplo 4 — AI SDK (Vercel) + actions, pensado para escalar

O mesmo painel de pedidos, sem framework de agente: **AI SDK v7** para o LLM e uma camada própria de actions para o app. O domínio é pequeno de propósito; a estrutura é a de um app que vai crescer.

```bash
npm install
cp .env.example .env    # padrão: Ollama local com qwen3.5:9b
npm run dev             # http://localhost:3004
npm test                # testes do núcleo (node:test)
npm run typecheck
```

Requer Node 22+. Sem dependência nativa: o banco é o SQLite embutido no Node (`node:sqlite`).

## Camadas

```
src/
  core/        núcleo: não conhece HTTP, React, banco nem LLM
    action.ts    defineAction / defineModule + tipos derivados
    registry.ts  o ÚNICO caminho de execução (valida, autoriza, executa, publica, loga)
    errors.ts    ActionError (mensagem segura) vs erro interno (genérico)
    events.ts    ChangeBus: "o recurso X mudou"
  modules/     um diretório por domínio
    pedidos/     actions + repositório + migrações do domínio
  app/
    modules.ts   manifesto: quais módulos existem + tipos para a UI
  infra/       implementações concretas (SQLite, conversas)
  server/      superfícies
    http/        rota genérica de actions, SSE de eventos, tradução de erros
    agent/       AI SDK: modelo, tools geradas, instruções, rota do chat
    app.ts       raiz de composição (único lugar que liga tudo)
  shared/      contratos servidor ↔ navegador (zod + tipos, sem código de servidor)
  web/         React: cliente tipado, sync por eventos, tela, chat (useChat)
```

**Regra de dependência:** `core` não importa ninguém; `modules` importam só `core`; `server` e `web` dependem de `core`/`modules`, nunca o contrário. É isso que permite trocar banco, provedor de LLM ou framework HTTP sem tocar em regra de negócio.

## Uma chamada, três caminhos, o mesmo destino

```
Botão "Cancelar" ──► POST /api/actions/pedidos_cancelar ─┐
Agente (tool call) ──► tool.execute ─────────────────────┼─► registry.execute ─► action.run
curl / outro sistema ──► POST /api/actions/... ──────────┘        │
                                                                  ├─ valida (zod)
                                                                  ├─ autoriza (permissão do usuário)
                                                                  ├─ publica ChangeEvent ─► SSE ─► UI recarrega
                                                                  └─ loga (origem, usuário, duração)
```

## Decisões pensando em escala

| Decisão | Por quê |
|---|---|
| Módulos com prefixo (`pedidos_*`) | 50 domínios sem colisão de nome; o prefixo também é o recurso dos eventos e das query keys. O registry recusa action duplicada ou sem prefixo **no boot**. |
| Tools montadas **por requisição**, filtradas por permissão | Segurança: o estagiário nem recebe `pedidos_cancelar`. Custo: menos tools = prompt menor = mais rápido e mais barato. |
| O agente age em nome do usuário | A identidade vai no `execute`, não é parâmetro da tool: o modelo não consegue "virar admin". |
| Histórico do chat no servidor; cliente manda só a mensagem nova | Cliente não reescreve o passado; payload constante em conversas longas; conversa de um usuário não abre para outro. |
| Tela (`ScreenState`) validada por schema | Vem do navegador: formato restrito para não virar prompt injection nas instruções. |
| `ActionError` vs erro interno | Mensagem de regra chega ao usuário e ao LLM; stack trace e detalhes de infra só no log. |
| Eventos de mudança por recurso (SSE) | A tela atualiza quando **qualquer** coisa muda (agente, outra aba, outro usuário, job), não só quando o chat termina. |
| Config validada no boot, provedor de LLM por env | Ollama em dev, Anthropic em produção: muda `.env`, não código. |
| `isStepCount(AI_MAX_STEPS)` + abort ao fechar a aba | Limite de custo: o loop não roda para sempre nem continua gastando sem ninguém olhando. |
| Tipos da UI derivados das actions | Renomeou campo na action? O `tsc` aponta cada chamada quebrada no React. |

## O que trocar quando crescer (as interfaces já existem)

| Hoje (estudo) | Produção | Onde |
|---|---|---|
| `node:sqlite` | Postgres (Drizzle/Kysely) | novas implementações de `PedidosRepository` e `ChatStore` |
| `createInMemoryChangeBus` | Redis pub/sub, Postgres LISTEN/NOTIFY | `ChangeBus` (necessário com mais de uma instância) |
| `devAuth` (cabeçalho) | sessão/JWT | `server/auth.ts`, que continua produzindo um `Actor` |
| logs `console` JSON | OpenTelemetry (`@ai-sdk/otel`) + logger estruturado | `Logger` do registry |
| todas as tools a cada chamada | `activeTools`/`toolSearch` do AI SDK por tela/módulo | `server/agent/tools.ts` (quando passar de ~30 tools) |
| sem aprovação | `toolApproval` do AI SDK para actions destrutivas | `chat.router.ts` |
| sem rate limit | limite por usuário na rota `/api/chat` | middleware |

## Comparando com os outros exemplos

| | Ex2 (conceito) | Ex3 (Agent-Native) | Ex4 (AI SDK + arquitetura própria) |
|---|---|---|---|
| Loop do agente | à mão | framework | AI SDK (`streamText`) |
| Actions | ~40 linhas | framework | núcleo próprio (~150 linhas) |
| Permissões | — | framework | registry + tools filtradas |
| Tempo por resposta (qwen 9B local) | não medido (2 tools) | minutos (97 tools) | ~3 s (3 tools) |
| Você entende cada linha? | sim | não | sim |

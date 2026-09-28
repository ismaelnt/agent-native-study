# agent-native-study

Quatro versões da **mesma solução** (um painel de pedidos com um agente embutido) para entender a proposta do [Agent-Native](https://www.agent-native.com/).

| | Exemplo 1 — na mão | Exemplo 2 — actions | Exemplo 3 — framework real |
|---|---|---|---|
| Porta | 3001 | 3002 | 8080 (`/pedidos`) |
| Lógica de cancelar | escrita **duas vezes** (rota + tool) | escrita **uma vez** (`actions.ts`) | escrita **uma vez** (`actions/cancelar-pedido.ts`) |
| Tools do agente | JSON Schema escrito à mão | geradas a partir das actions | geradas a partir das actions (auto-descobertas) |
| Sabe o que está na tela? | não | sim (`pedidoSelecionado` no request) | sim (`application_state`, enviado em toda mensagem) |
| Banco | memória | memória | SQL (PGlite local, Postgres em produção) |
| UI atualiza após o agente agir | polling manual | polling manual | `useDbSync` (automático) |

O Exemplo 2 **não usa o framework Agent-Native**. Ele implementa a ideia central em ~40 linhas (`define-action.ts`) para você ver o mecanismo por dentro, sem mágica. O Exemplo 3 é a mesma coisa com o framework de verdade.

O **Exemplo 4** ([exemplo-4-ai-sdk/](exemplo-4-ai-sdk/README.md)) usa o AI SDK da Vercel para o LLM e uma camada própria de actions, com arquitetura pensada para escalar: módulos, permissões que valem também para o agente, histórico no servidor, eventos em tempo real e testes. Porta 3004.

## Rodando

Requer Node 20.6+.

```bash
npm install
cp .env.example .env   # por padrão usa o Ollama local; veja o arquivo para usar a API da Anthropic
npm run ex1            # http://localhost:3001
npm run ex2            # http://localhost:3002 (em outro terminal)
```

### Com modelo local (Ollama)

O Ollama aceita a mesma Messages API da Anthropic, então o `agent-loop.ts` não muda: basta apontar `ANTHROPIC_BASE_URL` para `http://localhost:11434` e escolher o modelo em `MODEL`. Modelos pequenos (ex: `qwen3.5:9b`) às vezes erram tool calls; compare com um modelo maior para ver a diferença.

### Exemplo 3 (framework real)

Requer Node 22.22+ e pnpm. Gerado com `npx @agent-native/core create --template chat`.

```bash
cd exemplo-3-agent-native
pnpm install
pnpm dev               # http://localhost:8080/pedidos
```

O `.env` já desliga o login (`AUTH_DISABLED=true`) e aponta para o Ollama. Se o chat pedir um modelo, escolha **Custom keys → Ollama → qwen3.5:9b**.

Com um modelo local, cada pergunta demora alguns minutos: o framework envia seu system prompt e ~97 tools próprias (≈19k tokens por chamada), das quais só 2 são nossas.

O que olhar, comparando com o Exemplo 2:

| Exemplo 2 | Exemplo 3 |
|---|---|
| `define-action.ts` (mini framework) | `@agent-native/core/action` |
| `actions.ts` | `actions/listar-pedidos.ts`, `actions/cancelar-pedido.ts` |
| `shared/db.ts` | `server/db/schema.ts` + `server/plugins/db.ts` (migração + seed) |
| `tela.pedidoSelecionado` no `/chat` | `app/hooks/use-navigation-state.ts` + `actions/view-screen.ts` |
| `shared/agent-loop.ts` | o framework (`server/plugins/agent-chat.ts` só configura) |
| `shared/ui.html` | `app/routes/pedidos.tsx` com `useActionQuery`/`useActionMutation` + `<AgentSidebar>` |

## Roteiro de teste (faça nos três e compare)

1. Clique em **Cancelar** no pedido **1003** (status `enviado`). Nos dois exemplos, a UI bloqueia.
2. No chat, peça: **"cancela o pedido 1003"**.
   - Exemplo 1: o agente **consegue** cancelar. Bug: a tool reescreveu a lógica e esqueceu a regra.
   - Exemplo 2: o agente recebe o mesmo erro que a UI e te explica o motivo.
3. Selecione o pedido **1004** na tabela e peça **"cancela esse"**.
   - Exemplo 1: o agente não sabe qual é "esse".
   - Exemplo 2: ele sabe, porque o estado da tela vai junto.
   - Exemplo 3: igual ao 2, mas via `application_state` (a seleção fica na URL: `/pedidos?selecionado=1004`).
4. Repare que a tabela atualiza sozinha depois que o agente age: nos dois casos, UI e agente leem o mesmo banco.

## Estrutura

```
shared/
  db.ts            banco em memória
  agent-loop.ts    o loop de tool calling (igual nos dois exemplos)
  ui.html / ui.ts  a mesma tela para os dois exemplos
exemplo-1-na-mao/
  server.ts        rotas REST + tools escritas à mão (procure por ⚠️)
exemplo-2-actions/
  define-action.ts o "mini framework": defineAction, actionParaTool, executarAction
  actions.ts       todas as capacidades do app, uma única vez
  server.ts        gera rotas HTTP e tools a partir das actions
exemplo-3-agent-native/   app gerado pelo framework (veja a tabela acima)
exemplo-4-ai-sdk/         AI SDK + arquitetura própria (veja o README dele)
```

## Exercício sugerido

Adicione a capacidade **"marcar pedido como enviado"** nos dois exemplos e conte quantos lugares você precisou mexer em cada um.

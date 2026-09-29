import { createAuthPlugin } from "@agent-native/core/server";

// Projeto de estudo: sem tela de login/cadastro. Com AUTH_DISABLED=true (.env)
// toda requisição roda como o usuário dev local. Sem `marketing` e com
// rootAuth: false, "/" deixa de servir a landing de login e cai no app
// (app/routes/_index.tsx redireciona para /pedidos).
export default createAuthPlugin({
  rootAuth: false,
});

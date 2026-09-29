// Projeto de estudo: sem landing de login, "/" vai direto para a tela de pedidos.
import { redirect } from "react-router";

export function loader() {
  return redirect("/pedidos");
}

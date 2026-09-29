import { runAuthGuard } from "@agent-native/core/server";
import { defineEventHandler, deleteCookie, parseCookies, redirect } from "h3";

const OPT_OUT_SUFFIX = "_auth_disabled_opt_out";

function authDisabled() {
  const value = process.env.AUTH_DISABLED?.trim().toLowerCase();
  return value === "1" || value === "true";
}

export default defineEventHandler(async (event) => {
  if (authDisabled()) {
    const optOut = Object.keys(parseCookies(event)).filter((name) =>
      name.endsWith(OPT_OUT_SUFFIX),
    );
    if (optOut.length > 0) {
      for (const name of optOut) deleteCookie(event, name, { path: "/" });
      if (event.req.method === "GET") {
        const url = new URL(event.req.url);
        const destino = url.pathname.startsWith("/sign-in")
          ? "/"
          : url.pathname + url.search;
        return redirect(destino, 302);
      }
    }
  }
  return runAuthGuard(event);
});

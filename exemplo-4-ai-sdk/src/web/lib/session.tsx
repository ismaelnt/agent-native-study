import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Sessão de MENTIRA do modo dev: troca de usuário para ver permissões em ação.
 * Em produção isto some; o cookie de sessão vai sozinho em cada requisição.
 */
export const DEV_USERS = [
  { id: "gerente", label: "Gerente (pode cancelar)" },
  { id: "estagiario", label: "Estagiário (só leitura)" },
] as const;

interface Session {
  userId: string;
  setUserId: (id: string) => void;
}

const SessionContext = createContext<Session | null>(null);
const STORAGE_KEY = "ex4.devUser";

function readStoredUser(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "gerente";
  } catch {
    return "gerente";
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState(readStoredUser);
  const setUserId = (id: string) => {
    setUserIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Preferência opcional: sem storage, só não lembra na próxima visita.
    }
  };
  return <SessionContext.Provider value={{ userId, setUserId }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession fora do SessionProvider");
  return session;
}

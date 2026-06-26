import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "mm_active_client";
export const ALL_CLIENTS = "all";

interface ActiveClientCtx {
  activeClientId: string; // "all" of een client-id
  setActiveClientId: (id: string) => void;
}

const Ctx = createContext<ActiveClientCtx>({ activeClientId: ALL_CLIENTS, setActiveClientId: () => {} });

export function ActiveClientProvider({ children }: { children: ReactNode }) {
  const [activeClientId, setId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ALL_CLIENTS; } catch { return ALL_CLIENTS; }
  });
  const setActiveClientId = (id: string) => {
    setId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };
  return <Ctx.Provider value={{ activeClientId, setActiveClientId }}>{children}</Ctx.Provider>;
}

export function useActiveClient() {
  return useContext(Ctx);
}

// frontend/components/app/AppContext.tsx
// Context globale per dati utente — evita prop drilling in tutta l'app.
// me: utente corrente (da Supabase Auth + profiles)
// boardUsers: membri della board attiva (per avatar, nomi)

"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

interface AppCtxValue {
  me: User | null;
  boardUsers: User[];
}

// Valori di default (usati prima che WebShell carichi i dati reali)
const AppContext = createContext<AppCtxValue>({ me: null, boardUsers: [] });

// Hook per consumare il context nei componenti figli
export const useAppContext = () => useContext(AppContext);

export default AppContext;

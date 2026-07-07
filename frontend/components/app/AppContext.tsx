// frontend/components/app/AppContext.tsx
// Context globale per dati utente — evita prop drilling in tutta l'app.
// me: utente corrente (da Supabase Auth + profiles)
// boardUsers: membri della board attiva (per avatar, nomi, ruoli)
// refreshMe: ricarica il profilo (dopo modifica nome in ProfilePage)
// refreshBoardUsers: ricarica i membri della board attiva (dopo una rimozione)

"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

interface AppCtxValue {
  me: User | null;
  boardUsers: User[];
  // Callback opzionali forniti da WebShell per aggiornare lo stato condiviso.
  // Restano opzionali così i default (e i test) non devono fornirli.
  refreshMe?: () => Promise<void>;
  refreshBoardUsers?: () => Promise<void>;
}

// Valori di default (usati prima che WebShell carichi i dati reali)
const AppContext = createContext<AppCtxValue>({ me: null, boardUsers: [] });

// Hook per consumare il context nei componenti figli
export const useAppContext = () => useContext(AppContext);

export default AppContext;

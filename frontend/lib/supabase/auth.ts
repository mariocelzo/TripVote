// frontend/lib/supabase/auth.ts
// Helper per ottenere il JWT Supabase da passare come Authorization: Bearer al BE.
// getAuthToken() → lato client (Client Components, hooks)
// getAuthTokenServer() → lato server (Server Components, Route Handlers, Server Actions)

import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Restituisce il JWT access token della sessione corrente (lato client).
 * Usare in Client Components o hooks per autenticare le chiamate al BE FastAPI.
 * Restituisce null se l'utente non è loggato.
 *
 * Esempio:
 *   const token = await getAuthToken();
 *   fetch('/api/boards', { headers: { Authorization: `Bearer ${token}` } })
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Restituisce il JWT access token lato server (Server Components / Route Handlers).
 * Non usare mai in Client Components — usa getAuthToken() per quelli.
 */
export async function getAuthTokenServer(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

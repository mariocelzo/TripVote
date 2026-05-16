// frontend/lib/supabase/auth.ts
// Helper CLIENT-ONLY per ottenere il JWT Supabase.
// Usare SOLO in Client Components e hooks.
// Per Server Components / Route Handlers usa @/lib/supabase/auth-server

import { createClient } from "@/lib/supabase/client";

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

// frontend/lib/supabase/auth-server.ts
// Helper SERVER-ONLY per ottenere il JWT Supabase.
// Usare SOLO in Server Components, Route Handlers, Server Actions.
// NON importare mai questo file in Client Components — usa @/lib/supabase/auth

import { createClient } from "@/lib/supabase/server";

/**
 * Restituisce il JWT access token lato server (Server Components / Route Handlers).
 * Non usare mai in Client Components — usa getAuthToken() da @/lib/supabase/auth per quelli.
 */
export async function getAuthTokenServer(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

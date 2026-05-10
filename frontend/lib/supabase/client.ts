// frontend/lib/supabase/client.ts
// Crea un client Supabase per uso browser (Client Components).
// Usa createBrowserClient da @supabase/ssr che gestisce automaticamente
// i cookie di sessione nel browser senza localStorage.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// frontend/lib/supabase/server.ts
// Crea un client Supabase per uso server-side (Server Components, Route Handlers, Server Actions).
// Usa createServerClient da @supabase/ssr che legge/scrive i cookie tramite next/headers.
// IMPORTANTE: usare solo in contesti server — mai in Client Components.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Legge tutti i cookie dalla request corrente
        getAll() {
          return cookieStore.getAll();
        },
        // Scrive i cookie aggiornati nella response (es. refresh token)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll può fallire in Server Components read-only — ignorabile
            // perché il middleware si occupa del refresh della sessione
          }
        },
      },
    }
  );
}

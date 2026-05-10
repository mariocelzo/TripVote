// frontend/app/auth/callback/route.ts
// Route Handler che gestisce il callback OAuth di Supabase.
// Dopo che Google (o altro provider) autentica l'utente, Supabase rimanda qui
// con un `code` nella query string. Questo handler scambia il code per una sessione
// e reindirizza l'utente a /app (o al path specificato in `next`).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Supporta redirect personalizzato tramite query param `next` (es. invite link)
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const cookieStore = await cookies();

    // Client server-side per lo scambio del codice — scrive la sessione nei cookie
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // exchangeCodeForSession: converte il one-time code OAuth in una sessione persistente
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sessione valida → redirect a /app (o al path richiesto)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Qualcosa è andato storto → torna al login con parametro di errore
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

// frontend/middleware.ts
// Protegge tutte le route /app/* — redirect a /login se la sessione Supabase è assente.
// Usa @supabase/ssr per leggere/aggiornare i cookie di sessione ad ogni request,
// garantendo che il token venga refreshato automaticamente quando scade.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Clona la response base — verrà sostituita se Supabase aggiorna i cookie
  let supabaseResponse = NextResponse.next({ request });

  // Client middleware: legge i cookie dalla request e li scrive nella response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propaga i cookie sia nella request (per questa run) sia nella response (per il browser)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() fa una chiamata al server Supabase per validare la sessione.
  // Non usare getSession() qui — può essere falsificata lato client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protegge /app/* — redirect a /login se non autenticato
  if (request.nextUrl.pathname.startsWith("/app") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Restituisce la response con i cookie di sessione aggiornati
  return supabaseResponse;
}

export const config = {
  // Escludi file statici e _next per evitare overhead inutile
  matcher: ["/((?!_next|.*\\..*).*)"],
};

// frontend/middleware.ts
// Protegge tutte le route /app/* — redirect a /login se non autenticato.
// Le route pubbliche (/, /login, /signup, asset statici) non sono toccate.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Tutto sotto /app è protetto
const isProtected = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    // protect() solleva redirect a /login server-side — non bypassabile dal client
    await auth.protect();
  }
});

export const config = {
  // Escludi file statici e _next dal middleware per evitare overhead inutile
  matcher: ["/((?!_next|.*\\..*).*)"],
};

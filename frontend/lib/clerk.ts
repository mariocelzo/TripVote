// frontend/lib/clerk.ts
// Helper per estrarre il JWT Clerk da usare nelle chiamate al backend FastAPI.
//
// SICUREZZA:
// - getAuthToken() è usabile solo in Server Components, Route Handlers o Server Actions.
//   Il token non transita mai nel bundle JS del browser.
// - Per Client Components, usa useAuth().getToken() da @clerk/nextjs (vedi UserButton.tsx).
//
// UTILIZZO (Server Component):
//   import { getAuthToken } from "@/lib/clerk";
//   const token = await getAuthToken();
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boards/${id}/results`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });

import { auth } from "@clerk/nextjs/server";

/**
 * Restituisce il JWT Clerk da usare come Bearer nelle fetch al BE.
 * Restituisce null se l'utente non è autenticato.
 */
export async function getAuthToken(): Promise<string | null> {
  // In @clerk/nextjs v7, auth() è async e restituisce { getToken, ... }
  const { getToken } = await auth();
  return getToken();
}

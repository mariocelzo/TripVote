// frontend/lib/api/client.ts
// Utility per effettuare chiamate HTTP autenticate al backend FastAPI.
// NON importa React o componenti UI — è un modulo puro per la comunicazione con il BE.

import { getAuthToken } from "@/lib/supabase/auth";

/**
 * Restituisce l'URL completo per un path relativo del backend.
 * Utile per componenti che gestiscono il fetch manualmente (es. SWR, React Query).
 *
 * Esempio:
 *   const url = apiUrl("/trips/123"); // "https://tripvote-api.vercel.app/trips/123"
 */
export function apiUrl(path: string): string {
  // Recupera la base URL del backend dalle variabili d'ambiente pubbliche Next.js
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL non è definita nelle variabili d'ambiente"
    );
  }
  // Concatena la base URL con il path relativo (es. "/trips")
  return `${baseUrl}${path}`;
}

/**
 * Effettua una chiamata fetch autenticata al backend FastAPI.
 * Legge automaticamente il JWT dalla sessione Supabase e lo passa come Bearer token.
 *
 * @param path   - Path relativo dell'endpoint (es. "/trips", "/boards/123")
 * @param options - Opzioni native di fetch (method, body, headers extra, ecc.)
 * @returns       Il body della risposta parsato come JSON, tipizzato come T
 * @throws        Error se l'utente non è autenticato, o se la risposta HTTP non è ok
 *
 * Esempio:
 *   const trips = await apiFetch<Trip[]>("/trips");
 *   const trip  = await apiFetch<Trip>("/trips", {
 *     method: "POST",
 *     body: JSON.stringify({ name: "Roma 2026" }),
 *   });
 */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // 1. Ottieni il JWT dalla sessione Supabase corrente (lato client)
  const token = await getAuthToken();

  // 2. Se non c'è un token, l'utente non è autenticato: interrompi subito
  if (!token) {
    throw new Error("Non autenticato");
  }

  // 3. Costruisci l'URL completo del backend
  const url = apiUrl(path);

  // 4. Fai merge degli header di default con quelli eventuali passati dal caller.
  //    Il caller può sovrascrivere Content-Type se necessario (es. multipart/form-data).
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    // Gli header del caller sovrascrivono quelli di default se presenti
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  // 5. Chiama fetch con tutte le opzioni mergeate
  const response = await fetch(url, {
    ...options, // spread delle opzioni del caller (method, body, signal, ecc.)
    headers,    // usa gli header costruiti sopra (già mergeati)
  });

  // 6. Se la risposta non è 2xx, lancia un errore con status e messaggio leggibile
  if (!response.ok) {
    // Prova a leggere il corpo dell'errore per un messaggio più descrittivo
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Errore API [${response.status}]: ${errorText}`);
  }

  // 7. Parsa il body JSON e restituiscilo tipizzato come T
  return response.json() as Promise<T>;
}

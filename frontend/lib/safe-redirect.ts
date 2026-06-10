// frontend/lib/safe-redirect.ts
// Protezione contro gli open redirect.
//
// Un parametro `next` (es. /login?next=...) è controllato dall'utente: se lo
// usassimo direttamente in un redirect, un attaccante potrebbe forgiare un link
// che, dopo il login, manda la vittima su un dominio esterno di phishing.
// Accettiamo SOLO path interni relativi e sicuri.

/**
 * Restituisce `raw` solo se è un path interno sicuro, altrimenti `fallback`.
 *
 * Un path è considerato sicuro se:
 *  - inizia con un singolo "/" (relativo all'origine corrente)
 *  - non inizia con "//" o "/\\" (protocol-relative → dominio esterno)
 *  - non contiene backslash iniziali usati per aggirare il controllo
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback: string = "/app"
): string {
  if (!raw) return fallback;

  // Deve iniziare con "/" ma non essere protocol-relative ("//") né usare
  // backslash (alcuni browser normalizzano "\" in "/").
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/\\") || raw.startsWith("\\")) return fallback;

  return raw;
}

// frontend/lib/price.ts
// Conversione prezzi tra formato utente (euro, stringa) e formato DB (centesimi, int).
// Usato da AddProposalModal: l'utente scrive "89,90" → il DB salva 8990.

/**
 * Converte una stringa in euro (input utente) in centesimi interi.
 *
 * Tollerante con l'input reale di un form italiano:
 * - virgola o punto come separatore decimale ("89,90" e "89.90")
 * - spazi e simbolo € ("€ 45,50", "45,50 €")
 *
 * Restituisce null per input vuoto, non numerico o negativo —
 * null significa "prezzo non specificato" nel DB.
 */
export function parseEuroToCents(input: string): number | null {
  // Rimuove simbolo euro e spazi, normalizza la virgola italiana in punto
  const cleaned = input.replace(/€/g, "").trim().replace(",", ".");
  if (cleaned === "") return null;

  // Number() è strict: "12abc" → NaN (a differenza di parseFloat che darebbe 12)
  const euros = Number(cleaned);
  if (!Number.isFinite(euros) || euros < 0) return null;

  // Math.round evita errori floating point (19.99 * 100 = 1998.9999…)
  return Math.round(euros * 100);
}

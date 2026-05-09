// frontend/lib/utils.ts
// Utility pure per calcolo voti e applicazione voti
// Porta da primitives.jsx (computeVotes, myVote) + logica da web-app.jsx (applyVote)

import type { Proposal, VoteKind, VoteDistribution } from "./types";

/**
 * Calcola la distribuzione dei voti per una proposta.
 * Restituisce conteggi assoluti e percentuali.
 */
export function computeVotes(proposal: Proposal): VoteDistribution {
  const yes   = proposal.votes.yes.length;
  const maybe = proposal.votes.maybe.length;
  const no    = proposal.votes.no.length;
  const total = yes + maybe + no;
  const safe  = total || 1; // evita divisione per zero

  return {
    yes, maybe, no, total,
    pctYes:   (yes   / safe) * 100,
    pctMaybe: (maybe / safe) * 100,
    pctNo:    (no    / safe) * 100,
  };
}

/**
 * Restituisce il tipo di voto dell'utente su una proposta,
 * oppure null se non ha ancora votato.
 */
export function myVote(proposal: Proposal, userId: string): VoteKind | null {
  if (proposal.votes.yes.includes(userId))   return "yes";
  if (proposal.votes.maybe.includes(userId)) return "maybe";
  if (proposal.votes.no.includes(userId))    return "no";
  return null;
}

/**
 * Applica il voto di un utente a una proposta.
 * - Se l'utente ha già votato lo stesso tipo → toglie il voto (toggle)
 * - Altrimenti rimuove il suo voto precedente e aggiunge il nuovo
 *
 * Restituisce un nuovo oggetto votes (immutabile).
 */
export function applyVote(
  proposal: Proposal,
  userId: string,
  kind: VoteKind
): Proposal["votes"] {
  // Rimuove userId da tutti i gruppi
  const cleaned = {
    yes:   proposal.votes.yes.filter(id => id !== userId),
    maybe: proposal.votes.maybe.filter(id => id !== userId),
    no:    proposal.votes.no.filter(id => id !== userId),
  };

  // Se era già lo stesso voto → toggle off (torna senza voto)
  const wasSame = proposal.votes[kind].includes(userId);
  if (wasSame) return cleaned;

  // Altrimenti aggiunge il nuovo voto
  return { ...cleaned, [kind]: [...cleaned[kind], userId] };
}

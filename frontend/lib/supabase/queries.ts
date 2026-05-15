// frontend/lib/supabase/queries.ts
// Adapter functions — trasformano righe Supabase nei tipi app (Board, Proposal, User)
// Nessun componente deve importare supabase direttamente tranne WebShell e questa lib

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board, Proposal, User } from "@/lib/types";

// Colore avatar deterministico dal UUID (stesso palette di TV_USERS)
function userColor(id: string): string {
  const colors = ["#DD5C36", "#149478", "#2E3A8C", "#C68410", "#C0364B", "#0F6E5C", "#7A4FBF"];
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

// Calcola le iniziali dal display_name (max 2 caratteri)
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Formatta l'intervallo di date in formato italiano leggibile
function formatDates(start?: string | null, end?: string | null): string {
  if (!start && !end) return "Date da definire";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return `Da ${fmt(start)}`;
  return "Date da definire";
}

// Converte un timestamp ISO in "X min fa / X ore fa / ieri / X g fa"
function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min fa`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} ore fa`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ieri" : `${d} g fa`;
}

// Estrae il dominio da un URL (es. "https://booking.com/..." → "booking.com")
function domain(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Ritorna le board a cui appartiene l'utente, con count membri e proposte
export async function fetchMyBoards(
  sb: SupabaseClient,
  userId: string
): Promise<Board[]> {
  const { data, error } = await sb
    .from("board_members")
    .select(
      "boards(id, title, cover_url, start_date, end_date, board_members(user_id), proposals(id))"
    )
    .eq("user_id", userId);

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => m.boards)
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any): Board => ({
      id: b.id,
      title: b.title,
      dates: formatDates(b.start_date, b.end_date),
      cover:
        b.cover_url ??
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members: (b.board_members ?? []).map((m: any) => m.user_id as string),
      proposalsCount: (b.proposals ?? []).length,
    }));
}

// Ritorna i profili degli utenti membri di una board
export async function fetchBoardMembers(
  sb: SupabaseClient,
  boardId: string
): Promise<User[]> {
  const { data, error } = await sb
    .from("board_members")
    .select("profiles(id, display_name, avatar_url)")
    .eq("board_id", boardId);

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => m.profiles)
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any): User => ({
      id: p.id as string,
      name: p.display_name as string,
      initials: initials(p.display_name as string),
      color: userColor(p.id as string),
    }));
}

// Ritorna le proposte di una board con i voti di tutti i membri
export async function fetchProposals(
  sb: SupabaseClient,
  boardId: string
): Promise<Proposal[]> {
  const { data, error } = await sb
    .from("proposals")
    .select(
      "id, category, title, description, url, image_url, price_cents, rating, lat, lng, metadata, created_at, author_id, votes(user_id, value)"
    )
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any): Proposal => {
    // Separa i voti nei tre bucket yes/maybe/no
    const yes: string[] = [];
    const maybe: string[] = [];
    const no: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const v of p.votes ?? []) {
      if (v.value === 1) yes.push(v.user_id as string);
      else if (v.value === 0) maybe.push(v.user_id as string);
      else no.push(v.user_id as string);
    }

    // Mappa la categoria DB al ProposalType dell'app (other → activity)
    const rawCat = p.category as string;
    const type = rawCat === "other" ? "activity" : (rawCat as Proposal["type"]);

    return {
      id: p.id as string,
      type,
      title: p.title as string,
      subtitle: (p.description ?? "") as string,
      image:
        (p.image_url as string | null) ??
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
      source: domain(p.url as string | null),
      price:
        p.price_cents != null
          ? `€${Math.round((p.price_cents as number) / 100)}`
          : null,
      rating: (p.rating as number | null) ?? null,
      addedBy: p.author_id as string,
      addedAt: timeAgo(p.created_at as string),
      location:
        p.lat && p.lng
          ? {
              lat: p.lat as number,
              lng: p.lng as number,
              address:
                ((p.metadata as Record<string, unknown> | null)
                  ?.address as string) ?? "",
            }
          : undefined,
      note: ((p.metadata as Record<string, unknown> | null)
        ?.note as string | undefined),
      votes: { yes, maybe, no },
      // Considera "nuova" una proposta aggiunta nelle ultime 24 ore
      isNew: Date.now() - new Date(p.created_at as string).getTime() < 86400000,
    };
  });
}

// Scrive o aggiorna un voto per un utente su una proposta.
// Usa upsert con conflict su (proposal_id, user_id) per gestire il toggle.
export async function castVote(
  sb: SupabaseClient,
  proposalId: string,
  userId: string,
  kind: "yes" | "maybe" | "no"
): Promise<void> {
  const value = kind === "yes" ? 1 : kind === "maybe" ? 0 : -1;
  const { error } = await sb
    .from("votes")
    .upsert(
      { proposal_id: proposalId, user_id: userId, value },
      { onConflict: "proposal_id,user_id" }
    );
  if (error) throw error;
}

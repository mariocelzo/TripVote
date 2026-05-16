// __tests__/lib/supabase/queries.test.ts
// Test unitari per lib/supabase/queries.ts.
// Le funzioni accettano `sb: SupabaseClient` come primo argomento, quindi
// possiamo mockare l'intero client senza dover istanziare Supabase reale.
//
// Strategia mock:
//   - Ogni metodo di query Supabase ritorna "this" (builder pattern)
//     finché non si chiama await (che risolve la Promise).
//   - `vi.fn()` intercetta le chiamate e permette di asserire gli argomenti.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { castVote, fetchMyBoards, fetchProposals } from "@/lib/supabase/queries";

// ---------------------------------------------------------------------------
// Helpers per costruire mock del client Supabase
// ---------------------------------------------------------------------------

/**
 * Crea una catena di builder mock che si comporta come il PostgREST client.
 * L'ultimo metodo della catena risolve con `resolveWith`.
 * Tutti i metodi intermedi (.from, .select, .eq, .order, .upsert) sono spy.
 */
function makeChain(resolveWith: { data?: unknown; error?: unknown | null }) {
  // Il thenable viene restituito da ogni metodo intermedio:
  // `await sb.from(...).select(...)...` risolve questo oggetto.
  const thenable = {
    then(
      resolve: (v: { data: unknown; error: unknown }) => void,
      _reject: (e: unknown) => void
    ) {
      resolve({ data: resolveWith.data ?? null, error: resolveWith.error ?? null });
    },
  };

  // Ogni metodo restituisce `chain` stesso per supportare il chaining.
  // L'oggetto è anche thenable, quindi `await chain` funziona.
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_target, prop) {
      if (prop === "then") return thenable.then.bind(thenable);
      // Ritorna uno spy che restituisce lo stesso proxy per continuare il chain
      if (!chain[prop as string]) {
        chain[prop as string] = vi.fn(() => proxy);
      }
      return chain[prop as string];
    },
  });

  return proxy as unknown as {
    // Spy accessibili per le asserzioni
    from: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
}

/**
 * Crea un mock minimale di SupabaseClient: `.from()` restituisce una catena.
 * `fromSpy` permette di verificare su quale tabella è stata fatta la query.
 */
function makeSb(resolveWith: { data?: unknown; error?: unknown | null }) {
  const chain = makeChain(resolveWith);
  const fromSpy = vi.fn(() => chain);

  const sb = {
    from: fromSpy,
    // Espone la chain per accedere ai sotto-spy nelle asserzioni
    _chain: chain,
  };

  return sb as unknown as import("@supabase/supabase-js").SupabaseClient & {
    _chain: typeof chain;
    from: typeof fromSpy;
  };
}

// ---------------------------------------------------------------------------
// castVote
// ---------------------------------------------------------------------------

describe("castVote", () => {
  it("inserts a yes vote with value=1", async () => {
    // Arrange: mock senza errore
    const sb = makeSb({ error: null });

    // Act
    await castVote(sb, "prop-1", "user-1", "yes");

    // Assert: upsert chiamato con i campi corretti
    const upsertSpy = (sb._chain as unknown as Record<string, ReturnType<typeof vi.fn>>).upsert;
    expect(upsertSpy).toHaveBeenCalledOnce();
    const [row] = upsertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(row.value).toBe(1);
    expect(row.proposal_id).toBe("prop-1");
    expect(row.user_id).toBe("user-1");
  });

  it("inserts a maybe vote with value=0", async () => {
    const sb = makeSb({ error: null });
    await castVote(sb, "prop-2", "user-2", "maybe");

    const upsertSpy = (sb._chain as unknown as Record<string, ReturnType<typeof vi.fn>>).upsert;
    const [row] = upsertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(row.value).toBe(0);
  });

  it("inserts a no vote with value=-1", async () => {
    const sb = makeSb({ error: null });
    await castVote(sb, "prop-3", "user-3", "no");

    const upsertSpy = (sb._chain as unknown as Record<string, ReturnType<typeof vi.fn>>).upsert;
    const [row] = upsertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(row.value).toBe(-1);
  });

  it("throws when Supabase returns an error", async () => {
    // Arrange: mock con errore DB
    const sb = makeSb({ error: { message: "DB error" } });

    // Act + Assert: castVote deve propagare l'errore
    await expect(castVote(sb, "prop-1", "user-1", "yes")).rejects.toEqual({
      message: "DB error",
    });
  });

  it("passes onConflict:'proposal_id,user_id' as upsert second argument", async () => {
    const sb = makeSb({ error: null });
    await castVote(sb, "prop-1", "user-1", "yes");

    const upsertSpy = (sb._chain as unknown as Record<string, ReturnType<typeof vi.fn>>).upsert;
    const [, options] = upsertSpy.mock.calls[0] as [unknown, Record<string, unknown>];
    // Verifica la conflict key per gestire update idempotenti
    expect(options.onConflict).toBe("proposal_id,user_id");
  });
});

// ---------------------------------------------------------------------------
// fetchMyBoards
// ---------------------------------------------------------------------------

describe("fetchMyBoards", () => {
  it("returns an empty array when the user has no boards", async () => {
    const sb = makeSb({ data: [], error: null });
    const result = await fetchMyBoards(sb, "user-99");
    expect(result).toEqual([]);
  });

  it("maps DB rows to Board type correctly", async () => {
    // Arrange: riga DB come la ritorna Supabase con join embedded
    const dbRow = {
      boards: {
        id: "b1",
        title: "Tokyo",
        cover_url: "https://example.com/cover.jpg",
        start_date: "2025-10-10",
        end_date: "2025-10-20",
        board_members: [{ user_id: "u1" }, { user_id: "u2" }],
        proposals: [{ id: "p1" }],
      },
    };
    const sb = makeSb({ data: [dbRow], error: null });

    // Act
    const [board] = await fetchMyBoards(sb, "u1");

    // Assert
    expect(board.id).toBe("b1");
    expect(board.title).toBe("Tokyo");
    expect(board.proposalsCount).toBe(1);
    expect(board.members).toEqual(["u1", "u2"]);
    expect(board.cover).toBe("https://example.com/cover.jpg");
  });

  it("uses default Unsplash cover when cover_url is null", async () => {
    const dbRow = {
      boards: {
        id: "b2",
        title: "Paris",
        cover_url: null, // nessuna cover impostata dall'utente
        start_date: null,
        end_date: null,
        board_members: [],
        proposals: [],
      },
    };
    const sb = makeSb({ data: [dbRow], error: null });
    const [board] = await fetchMyBoards(sb, "u1");

    // Deve usare il fallback unsplash definito in queries.ts
    expect(board.cover).toContain("unsplash.com");
  });

  it("throws when Supabase returns an error", async () => {
    const sb = makeSb({ data: null, error: { message: "Network error" } });
    await expect(fetchMyBoards(sb, "u1")).rejects.toEqual({ message: "Network error" });
  });
});

// ---------------------------------------------------------------------------
// fetchProposals
// ---------------------------------------------------------------------------

describe("fetchProposals", () => {
  // Riga DB base usata in più test; ogni test estende/sovrascrive campi necessari
  const baseProposal = {
    id: "p1",
    category: "hotel",
    title: "Grand Hotel",
    description: "Bellissimo hotel",
    url: "https://booking.com/grand",
    image_url: "https://example.com/img.jpg",
    price_cents: null,
    rating: null,
    lat: null,
    lng: null,
    metadata: null,
    created_at: new Date().toISOString(), // meno di 24h fa → isNew:true
    author_id: "u1",
    votes: [],
  };

  it("maps votes to yes/maybe/no arrays correctly", async () => {
    const proposal = {
      ...baseProposal,
      votes: [
        { user_id: "u1", value: 1 },  // yes
        { user_id: "u2", value: 0 },  // maybe
        { user_id: "u3", value: -1 }, // no
      ],
    };
    const sb = makeSb({ data: [proposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    expect(result.votes.yes).toEqual(["u1"]);
    expect(result.votes.maybe).toEqual(["u2"]);
    expect(result.votes.no).toEqual(["u3"]);
  });

  it("maps category 'other' to type 'activity'", async () => {
    const proposal = { ...baseProposal, category: "other" };
    const sb = makeSb({ data: [proposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    // "other" è una categoria DB che l'app visualizza come "activity"
    expect(result.type).toBe("activity");
  });

  it("calculates price in euros from price_cents", async () => {
    // 15000 centesimi = €150
    const proposal = { ...baseProposal, price_cents: 15000 };
    const sb = makeSb({ data: [proposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    expect(result.price).toBe("€150");
  });

  it("marks proposal as isNew when created within the last 24h", async () => {
    // Proposta appena creata (now) → isNew:true
    const recentProposal = { ...baseProposal, created_at: new Date().toISOString() };
    const sb = makeSb({ data: [recentProposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    expect(result.isNew).toBe(true);
  });

  it("does NOT mark proposal as isNew when older than 24h", async () => {
    // Proposta del 2020 → isNew:false
    const oldProposal = { ...baseProposal, created_at: "2020-01-01T00:00:00Z" };
    const sb = makeSb({ data: [oldProposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    expect(result.isNew).toBe(false);
  });

  it("sets price to null when price_cents is null", async () => {
    const sb = makeSb({ data: [baseProposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    expect(result.price).toBeNull();
  });

  it("uses default image when image_url is null", async () => {
    const proposal = { ...baseProposal, image_url: null };
    const sb = makeSb({ data: [proposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    // Fallback definito in queries.ts
    expect(result.image).toContain("unsplash.com");
  });

  it("extracts domain from url as source", async () => {
    const proposal = { ...baseProposal, url: "https://www.booking.com/hotel/grand" };
    const sb = makeSb({ data: [proposal], error: null });
    const [result] = await fetchProposals(sb, "board-1");

    // domain() strisce il prefisso www.
    expect(result.source).toBe("booking.com");
  });

  it("throws when Supabase returns an error", async () => {
    const sb = makeSb({ data: null, error: { message: "Query failed" } });
    await expect(fetchProposals(sb, "board-1")).rejects.toEqual({ message: "Query failed" });
  });
});

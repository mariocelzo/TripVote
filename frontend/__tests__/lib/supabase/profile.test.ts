// __tests__/lib/supabase/profile.test.ts
// Test TDD per le nuove funzioni di queries.ts:
//   - removeBoardMember (rimozione membro board — RLS: owner o self)
//   - updateProfile (nome visualizzato e/o prefs)
//   - fetchProfileMeta (created_at + prefs per ProfilePage/SettingsPage)
//   - fetchBoardMembers con role (Owner/Editor/Membro reali in InvitePage)

import { describe, it, expect, vi } from "vitest";
import {
  removeBoardMember,
  updateProfile,
  fetchProfileMeta,
  fetchBoardMembers,
} from "@/lib/supabase/queries";

// ── Mock helpers (stesso pattern di queries.test.ts) ──

function makeChain(resolveWith: { data?: unknown; error?: unknown | null }) {
  const thenable = {
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve({ data: resolveWith.data ?? null, error: resolveWith.error ?? null });
    },
  };
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_t, prop) {
      if (prop === "then") return thenable.then.bind(thenable);
      if (!chain[prop as string]) chain[prop as string] = vi.fn(() => proxy);
      return chain[prop as string];
    },
  });
  return proxy;
}

function makeSb(resolveWith: { data?: unknown; error?: unknown | null }) {
  const chain = makeChain(resolveWith);
  const fromSpy = vi.fn(() => chain);
  return {
    from: fromSpy,
    _chain: chain as Record<string, ReturnType<typeof vi.fn>>,
  } as unknown as import("@supabase/supabase-js").SupabaseClient & {
    _chain: Record<string, ReturnType<typeof vi.fn>>;
    from: ReturnType<typeof vi.fn>;
  };
}

// ── removeBoardMember ──

describe("removeBoardMember", () => {
  it("cancella da board_members filtrando per board e utente", async () => {
    const sb = makeSb({ error: null });
    await removeBoardMember(sb, "board-1", "user-2");

    expect(sb.from).toHaveBeenCalledWith("board_members");
    expect(sb._chain.delete).toHaveBeenCalledOnce();
    // Entrambi i filtri eq devono essere presenti (board_id E user_id)
    const eqCalls = sb._chain.eq.mock.calls;
    expect(eqCalls).toContainEqual(["board_id", "board-1"]);
    expect(eqCalls).toContainEqual(["user_id", "user-2"]);
  });

  it("propaga l'errore del DB (es. RLS nega la delete)", async () => {
    const sb = makeSb({ error: { message: "permission denied" } });
    await expect(removeBoardMember(sb, "b", "u")).rejects.toBeTruthy();
  });
});

// ── updateProfile ──

describe("updateProfile", () => {
  it("aggiorna display_name quando fornito", async () => {
    const sb = makeSb({ error: null });
    await updateProfile(sb, "user-1", { displayName: "Mario Rossi" });

    expect(sb.from).toHaveBeenCalledWith("profiles");
    const [payload] = sb._chain.update.mock.calls[0] as [Record<string, unknown>];
    expect(payload.display_name).toBe("Mario Rossi");
    expect(payload).not.toHaveProperty("prefs");
    expect(sb._chain.eq.mock.calls).toContainEqual(["id", "user-1"]);
  });

  it("aggiorna prefs quando fornite", async () => {
    const sb = makeSb({ error: null });
    await updateProfile(sb, "user-1", { prefs: { dark: true, ghost: false } });

    const [payload] = sb._chain.update.mock.calls[0] as [Record<string, unknown>];
    expect(payload.prefs).toEqual({ dark: true, ghost: false });
    expect(payload).not.toHaveProperty("display_name");
  });

  it("non chiama il DB se non c'è nulla da aggiornare", async () => {
    const sb = makeSb({ error: null });
    await updateProfile(sb, "user-1", {});
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("rifiuta displayName vuoto (il DB ha not null)", async () => {
    const sb = makeSb({ error: null });
    await expect(updateProfile(sb, "user-1", { displayName: "   " })).rejects.toThrow();
    expect(sb.from).not.toHaveBeenCalled();
  });
});

// ── fetchProfileMeta ──

describe("fetchProfileMeta", () => {
  it("ritorna createdAt e prefs dal profilo", async () => {
    const sb = makeSb({
      data: { created_at: "2026-05-06T08:20:50Z", prefs: { dark: true } },
    });
    const meta = await fetchProfileMeta(sb, "user-1");

    expect(sb.from).toHaveBeenCalledWith("profiles");
    expect(meta.createdAt).toBe("2026-05-06T08:20:50Z");
    expect(meta.prefs).toEqual({ dark: true });
  });

  it("ritorna default sicuri se prefs è null", async () => {
    const sb = makeSb({ data: { created_at: "2026-05-06T08:20:50Z", prefs: null } });
    const meta = await fetchProfileMeta(sb, "user-1");
    expect(meta.prefs).toEqual({});
  });
});

// ── fetchBoardMembers con role ──

describe("fetchBoardMembers con role", () => {
  it("include il ruolo di ogni membro", async () => {
    const sb = makeSb({
      data: [
        {
          role: "owner",
          profiles: { id: "u1", display_name: "Mario Rossi", avatar_url: null },
        },
        {
          role: "voter",
          profiles: { id: "u2", display_name: "Lucia Bianchi", avatar_url: null },
        },
      ],
    });
    const members = await fetchBoardMembers(sb, "board-1");

    expect(members).toHaveLength(2);
    expect(members[0].role).toBe("owner");
    expect(members[1].role).toBe("voter");
    // I campi esistenti restano invariati
    expect(members[0].name).toBe("Mario Rossi");
    expect(members[0].initials).toBe("MR");
  });
});

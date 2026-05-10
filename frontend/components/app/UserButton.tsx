// frontend/components/app/UserButton.tsx
// Avatar e menu utente reale via Supabase Auth.
// Mostra nome, avatar (Google photo o iniziale), con dropdown per logout.
// Sostituisce la precedente versione basata su Clerk.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * SidebarUserButton — mostra:
 * - Avatar dell'utente (foto Google se disponibile, altrimenti iniziale)
 * - Nome / email cliccabile per aprire pagina profilo
 * - Dropdown con "Logout" al click sull'avatar
 *
 * Props:
 *   onProfile — callback invocato quando l'utente clicca sul nome
 */
export function SidebarUserButton({ onProfile }: { onProfile: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Carica l'utente corrente al mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // Ascolta i cambi di sessione (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chiude il menu se si clicca fuori
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout: cancella la sessione e torna alla landing
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Priorità nome: fullName Google > firstName > parte locale email > fallback
  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Utente";

  // Avatar: foto profilo Google se disponibile, altrimenti iniziale
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = displayName[0]?.toUpperCase() ?? "U";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }} ref={menuRef}>
      {/* Avatar con dropdown logout */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          title="Menu utente"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            overflow: "hidden",
            cursor: "pointer",
            border: "none",
            padding: 0,
            background: "#E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
              {initial}
            </span>
          )}
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              minWidth: 140,
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            <button
              onClick={handleSignOut}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 14px",
                textAlign: "left",
                background: "none",
                border: "none",
                fontSize: 13,
                color: "#dc2626",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Esci
            </button>
          </div>
        )}
      </div>

      {/* Nome cliccabile → pagina profilo */}
      <button
        onClick={onProfile}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          background: "none",
          border: "none",
          cursor: "pointer",
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink-900, #1a1a1a)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 120,
          }}
        >
          {displayName}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-muted, #888)" }}>
          Il mio profilo
        </span>
      </button>
    </div>
  );
}

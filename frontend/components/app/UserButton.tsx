// frontend/components/app/UserButton.tsx
// Avatar e menu utente reale via Clerk.
// Sostituisce il mock TV_ME in Sidebar — mostra nome, avatar e permette logout.

"use client";

import { UserButton as ClerkUserButton, useUser } from "@clerk/nextjs";

/**
 * SidebarUserButton — componente Client che mostra:
 * - Avatar Clerk con dropdown nativo (gestisci account, logout)
 * - Nome visualizzato cliccabile per navigare alla pagina profilo
 *
 * Props:
 *   onProfile — callback invocato quando l'utente clicca sul nome/profilo
 */
export function SidebarUserButton({
  onProfile,
}: {
  onProfile: () => void;
}) {
  const { user } = useUser();

  // Priorità nome: fullName > firstName > parte locale email > fallback
  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "Utente";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      {/* ClerkUserButton: avatar + dropdown (gestisci account, logout).
          In @clerk/nextjs v7, il redirect post-logout si configura su ClerkProvider
          tramite la prop `afterSignOutUrl` — non su UserButton. */}
      <ClerkUserButton
        appearance={{
          elements: {
            // Dimensioni avatar coerenti con la sidebar compatta
            avatarBox: { width: 30, height: 30 },
          },
        }}
      />

      {/* Nome cliccabile per aprire la pagina profilo */}
      <button
        onClick={onProfile}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          background: "none",
          border: "none",
          cursor: "pointer",
          minWidth: 0, // evita overflow del testo in layout flex
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>
          {displayName}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Il mio profilo</span>
      </button>
    </div>
  );
}

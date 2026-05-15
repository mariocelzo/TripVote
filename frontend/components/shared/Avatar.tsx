// frontend/components/shared/Avatar.tsx
// Avatar singolo e AvatarStack — porta da primitives.jsx
// AvatarStack usa AppContext per risolvere gli userId in oggetti User reali

"use client";

import React from "react";
import type { User } from "@/lib/types";
import { useAppContext } from "@/components/app/AppContext";

interface AvatarProps {
  user: User;
  size?: number;
  ring?: boolean;
  style?: React.CSSProperties;
}

/**
 * Avatar singolo — mostra le iniziali con il colore dell'utente.
 * ring=true aggiunge il bordo bianco (utile negli stack).
 */
export function Avatar({ user, size = 28, ring = true, style }: AvatarProps) {
  return (
    <span
      className="tv-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
        background: user.color ?? "var(--ink-300)",
        color: "#fff",
        border: ring ? `${Math.max(2, Math.floor(size / 14))}px solid var(--surface)` : "none",
        ...style,
      }}
      title={user.name}
    >
      {user.initials}
    </span>
  );
}

interface AvatarStackProps {
  userIds: string[];
  max?: number;
  size?: number;
}

/**
 * Stack di avatar sovrapposti.
 * Risolve gli userId tramite boardUsers dal context (dati reali da Supabase).
 * Se i membri superano max, mostra un "+N" finale.
 */
export function AvatarStack({ userIds, max = 4, size = 26 }: AvatarStackProps) {
  // Legge la lista membri board dal context per risolvere gli UUID in User
  const { boardUsers } = useAppContext();

  const users = userIds
    .map((id) => boardUsers.find((u) => u.id === id))
    .filter((u): u is User => Boolean(u));

  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <span className="tv-avatars" style={{ alignItems: "center" }}>
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className="tv-avatar"
          style={{
            width: size, height: size, fontSize: 10,
            background: "var(--ink-200)", color: "var(--ink-700)",
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

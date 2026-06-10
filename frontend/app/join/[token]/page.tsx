// frontend/app/join/[token]/page.tsx
// Pagina di adesione a una board tramite invite link (/join/<token>).
//
// Flusso:
//   1. Se l'utente non è autenticato → redirect a /login?next=/join/<token>
//      (dopo il login torna qui automaticamente).
//   2. Se autenticato → chiama il BE POST /boards/join con il token.
//      Il BE valida il token con la service-role key e crea la membership
//      (il client NON può inserirsi da solo: RLS lo vieta, vedi migration 0006).
//   3. Successo → redirect a /app. Errore → messaggio leggibile.

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";

type Status = "checking" | "joining" | "error";

interface JoinResponse {
  board_id: string;
  title: string;
  already_member: boolean;
}

export default function JoinBoardPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setErrorMsg("Link di invito non valido.");
        setStatus("error");
        return;
      }

      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();

      // Non autenticato → manda al login, poi torna qui (next validato lato login)
      if (!authData.user) {
        const nextPath = `/join/${encodeURIComponent(token)}`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      // Autenticato → tenta il join via backend
      if (cancelled) return;
      setStatus("joining");
      try {
        await apiFetch<JoinResponse>("/boards/join", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        // Entrato (o già membro): vai all'app
        router.replace("/app");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof Error
            ? messageFromError(err.message)
            : "Impossibile unirsi alla board."
        );
        setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <span style={{ fontSize: 28 }}>✈️</span>
        {status === "error" ? (
          <>
            <h1 style={titleStyle}>Invito non valido</h1>
            <p style={subtitleStyle}>{errorMsg}</p>
            <button onClick={() => router.replace("/app")} style={btnStyle}>
              Vai alle tue board
            </button>
          </>
        ) : (
          <>
            <h1 style={titleStyle}>Ti stiamo aggiungendo…</h1>
            <p style={subtitleStyle}>
              {status === "checking"
                ? "Verifica dell'accesso in corso."
                : "Adesione alla board in corso."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Traduce i messaggi di errore tecnici del BE in testo comprensibile.
function messageFromError(raw: string): string {
  if (raw.includes("404")) return "L'invito non è valido o è scaduto.";
  if (raw.includes("409")) return "Questa board non accetta nuovi membri.";
  if (raw.includes("429")) return "Troppi tentativi. Riprova tra qualche minuto.";
  if (raw.includes("Non autenticato")) return "Devi accedere per unirti alla board.";
  return "Impossibile unirsi alla board. Riprova più tardi.";
}

// ── Stili ──
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg, #F8F3EC)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "white",
  borderRadius: 16,
  padding: "32px 28px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: "12px 0 6px",
  color: "var(--ink-900, #1a1a1a)",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--fg-muted, #888)",
  marginBottom: 20,
};

const btnStyle: React.CSSProperties = {
  padding: "11px 20px",
  background: "#4F46E5",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

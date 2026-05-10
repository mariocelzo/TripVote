// frontend/app/login/page.tsx
// Pagina di login pubblica — email+password + OAuth Google.
// Usa il client Supabase browser-side per autenticare l'utente.
// Dopo il login, redirect a /app tramite router.push + router.refresh().

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Login con email + password
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // router.refresh() forza il middleware a ri-leggere la sessione aggiornata
      router.push("/app");
      router.refresh();
    }
  }

  // OAuth Google — Supabase reindirizza a Google, poi torna su /auth/callback
  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo / titolo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 28 }}>✈️</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px", color: "var(--ink-900, #1a1a1a)" }}>
            Bentornato su TripVote
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg-muted, #888)" }}>
            Accedi per votare il tuo prossimo viaggio
          </p>
        </div>

        {/* Form email + password */}
        <form onSubmit={handleLogin} style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ ...inputStyle, marginBottom: 4 }}
          />

          {/* Messaggio di errore */}
          {error && (
            <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 12 }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>

        {/* Separatore */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>oppure</span>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

        {/* Google OAuth */}
        <button onClick={handleGoogle} style={btnGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" />
          </svg>
          Continua con Google
        </button>

        {/* Link a signup */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--fg-muted, #888)" }}>
          Non hai un account?{" "}
          <a href="/signup" style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>
            Registrati
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Stili ──────────────────────────────────────────────────────────────────────

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
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "11px 14px",
  marginBottom: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  color: "#111",
};

const btnPrimary: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px",
  background: "#4F46E5",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 8,
};

const btnGoogle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "11px",
  background: "white",
  color: "#374151",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

// frontend/components/pages/SettingsPage.tsx
// Impostazioni account + notifiche con toggle persistenti.
// Le preferenze sono salvate in profiles.prefs (jsonb) — RLS profiles_update_own
// garantisce che ogni utente possa scrivere solo le proprie.
// "Esci dall'account" esegue il signOut Supabase reale.

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchProfileMeta, updateProfile } from "@/lib/supabase/queries";
import { useAppContext } from "@/components/app/AppContext";
import Icon from "@/components/shared/Icon";

function ToggleRow({ label, sub, value, onChange }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>
      </div>
      {/* Toggle switch animato */}
      <button onClick={() => onChange(!value)} role="switch" aria-checked={value}
        aria-label={label} style={{
        width: 44, height: 24, borderRadius: 99, flexShrink: 0,
        background: value ? "var(--teal-600)" : "var(--ink-300)",
        position: "relative", transition: "background 200ms",
        border: "none", cursor: "pointer",
      }}>
        <span style={{
          position: "absolute", top: 2,
          left: value ? 22 : 2,
          width: 20, height: 20, borderRadius: 99, background: "#fff",
          transition: "left 200ms var(--ease-spring)",
          boxShadow: "var(--shadow-sm)",
          display: "block",
        }} />
      </button>
    </div>
  );
}

const SECTIONS = [
  { title: "Notifiche", rows: [
    { key: "ghost",  label: "Voti in tempo reale", sub: "Banner quando un amico vota" },
    { key: "add",    label: "Nuove proposte",       sub: "Notifica quando qualcuno aggiunge" },
    { key: "decide", label: "Decisioni raggiunte",  sub: "Avviso consenso ≥ 5/7" },
  ]},
  { title: "Aspetto", rows: [
    { key: "compact", label: "Densità compatta", sub: "Card più piccole, più proposte visibili" },
    { key: "dark",    label: "Modalità scura",   sub: "Prossimamente" },
  ]},
];

// Valori di default quando l'utente non ha ancora salvato preferenze
const DEFAULT_PREFS: Record<string, boolean> = {
  ghost: true, add: true, decide: true, compact: false, dark: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const { me } = useAppContext();
  const supabase = createClient();

  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);
  // Timer per il debounce del salvataggio (evita una write per ogni click rapido)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Carica le preferenze salvate al mount ── */
  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    fetchProfileMeta(supabase, me.id)
      .then(({ prefs: saved }) => {
        if (!cancelled) setPrefs({ ...DEFAULT_PREFS, ...saved });
      })
      .catch((err) => console.error("Errore caricamento preferenze:", err));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  /* ── Cambia un toggle: aggiorna subito la UI, salva con debounce 600ms ── */
  function handleToggle(key: string, value: boolean) {
    if (!me) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await updateProfile(supabase, me.id, { prefs: next });
        setSaveState("saved");
        // Torna a idle dopo 2s per non lasciare il messaggio fisso
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (err) {
        console.error("Errore salvataggio preferenze:", err);
        setSaveState("error");
      }
    }, 600);
  }

  /* ── Logout reale: signOut Supabase + redirect alla landing ── */
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Errore logout:", err);
      setSigningOut(false);
    }
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
          letterSpacing: "-0.025em", marginBottom: 32 }}>Impostazioni</h1>
        {/* Indicatore stato salvataggio */}
        <span aria-live="polite" style={{ fontSize: 12, color:
          saveState === "error" ? "var(--rose-600)" : "var(--fg-muted)" }}>
          {saveState === "saving" && "Salvataggio…"}
          {saveState === "saved"  && "✓ Salvato"}
          {saveState === "error"  && "Errore di salvataggio — riprova"}
        </span>
      </div>

      {SECTIONS.map(sec => (
        <div key={sec.title} className="tv-card" style={{ padding: "4px 24px", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
            letterSpacing: "-0.015em", margin: "20px 0 4px" }}>{sec.title}</h2>
          {sec.rows.map(r => (
            <ToggleRow key={r.key} label={r.label} sub={r.sub}
              value={prefs[r.key] ?? false}
              onChange={v => handleToggle(r.key, v)} />
          ))}
          <div style={{ height: 8 }} />
        </div>
      ))}

      {/* Zona pericolo */}
      <div className="tv-card" style={{ padding: 24, border: "1px solid var(--rose-100)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
          color: "var(--rose-600)", margin: "0 0 16px" }}>Zona pericolo</h2>
        <button onClick={handleSignOut} disabled={signingOut} className="tv-btn" style={{
          background: "var(--rose-100)", color: "var(--rose-600)",
          height: 40, padding: "0 16px", fontSize: 13, fontWeight: 700,
          borderRadius: "var(--radius-full)",
          opacity: signingOut ? 0.6 : 1,
          cursor: signingOut ? "not-allowed" : "pointer",
        }}>
          <Icon name="logout" size={14} />
          {signingOut ? "Uscita in corso…" : "Esci dall'account"}
        </button>
      </div>
    </div>
  );
}

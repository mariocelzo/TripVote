// frontend/components/landing/Testimonials.tsx
// 3 quote testimonials con avatar utenti mock

import React from "react";
import { Avatar } from "@/components/shared/Avatar";
import { TV_USERS } from "@/lib/data";

const QUOTES = [
  { uid: "u2", role: "Viaggiatrice seriale",
    text: "Finalmente basta con i thread infiniti su WhatsApp. Con TripVote abbiamo deciso Tokyo in 20 minuti." },
  { uid: "u3", role: "Organizzatore di gruppo",
    text: "Ho provato Google Sheets, Notion, tutto. Questo è l'unico tool dove gli amici pigri votano davvero." },
  { uid: "u6", role: "UX Designer",
    text: "Le animazioni quando voti sono una cosa stupida ma mi fanno venir voglia di usarla ogni giorno." },
];

export default function Testimonials() {
  return (
    <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)", padding: "80px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="tv-overline">// testimonianze</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 500,
            letterSpacing: "-0.025em", marginTop: 12 }}>
            Chi ha già votato il prossimo viaggio
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28 }}>
          {QUOTES.map((q, i) => {
            const user = TV_USERS.find(u => u.id === q.uid)!;
            return (
              <div key={i} className="tv-card" style={{ padding: "28px 24px" }}>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-800)",
                  margin: "0 0 20px", fontStyle: "italic" }}>
                  &ldquo;{q.text}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar user={user} size={36} ring={false} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-900)" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{q.role}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

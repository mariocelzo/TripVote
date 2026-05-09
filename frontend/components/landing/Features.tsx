// frontend/components/landing/Features.tsx
// Griglia feature cards 6 item

import React from "react";
import Icon from "@/components/shared/Icon";

const FEATS = [
  { icon: "thumbs-up", color: "var(--teal-600)",  bg: "var(--teal-100)",
    title: "Voto Sì / Forse / No",
    desc: "Sistema tricolore con avatar stack: vedi subito chi vuole cosa, senza ambiguità." },
  { icon: "bell",      color: "var(--coral-600)", bg: "var(--coral-100)",
    title: "Aggiornamenti live",
    desc: "I voti appaiono in tempo reale con animazioni fluide. Senza ricaricare la pagina." },
  { icon: "link",      color: "var(--amber-600)", bg: "var(--amber-100)",
    title: "Aggiungi da link",
    desc: "Incolla un URL — hotel, volo, ristorante — e TripVote genera l'anteprima automaticamente." },
  { icon: "map",       color: "var(--indigo-700)",bg: "var(--indigo-100)",
    title: "Mappa integrata",
    desc: "Tutte le proposte su mappa. Pin colorati per categoria, vista compatta sul telefono." },
  { icon: "wa",        color: "var(--teal-600)",  bg: "var(--teal-100)",
    title: "Condivisione WhatsApp",
    desc: "Un link, nessuna app da scaricare. Gli amici votano dal browser." },
  { icon: "calendar",  color: "var(--rose-600)",  bg: "var(--rose-100)",
    title: "Itinerario automatico",
    desc: "Le proposte con più voti Sì vengono ordinate in un itinerario pronto da stampare." },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: "80px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="tv-overline">// funzionalità</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 500,
            letterSpacing: "-0.025em", marginTop: 12 }}>
            Tutto quello che serve, niente di più
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 }}>
          {FEATS.map(f => (
            <div key={f.title} className="tv-card" style={{ padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius)", background: f.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, color: f.color }}>
                <Icon name={f.icon} size={20} />
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600,
                letterSpacing: "-0.015em", marginTop: 0, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--ink-600)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

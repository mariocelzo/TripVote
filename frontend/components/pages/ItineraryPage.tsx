// frontend/components/pages/ItineraryPage.tsx
// Timeline itinerario giorno per giorno — porta da web-pages.jsx

import React from "react";
import type { Proposal } from "@/lib/types";
import { computeVotes } from "@/lib/utils";
import Icon from "@/components/shared/Icon";

interface Props { proposals: Proposal[]; }

const DAYS = [
  { date: "28 dic", weekday: "Lun", title: "Arrivo & jet-lag", items: [
    { time: "13:45", icon: "plane",  title: "Atterraggio HND",       sub: "ITA AZ792 da Roma",           color: "var(--indigo-700)" },
    { time: "16:00", icon: "bed",    title: "Check-in Park Hyatt",   sub: "Shinjuku · suite 4 persone",  color: "var(--coral-600)" },
    { time: "19:30", icon: "fork",   title: "Cena ramen leggera",    sub: "Ichiran Shinjuku",            color: "var(--amber-600)" },
  ]},
  { date: "29 dic", weekday: "Mar", title: "Quartieri storici", items: [
    { time: "09:00", icon: "pin",    title: "Senso-ji + Asakusa",    sub: "tempio + mercato",            color: "var(--rose-600)" },
    { time: "12:30", icon: "fork",   title: "Pranzo a Yanaka",       sub: "izakaya tradizionale",        color: "var(--amber-600)" },
    { time: "15:00", icon: "spark",  title: "TeamLab Planets",       sub: "esperienza immersiva · 2.5h", color: "var(--coral-600)" },
    { time: "20:00", icon: "fork",   title: "Sukiyabashi Jiro",      sub: "prenotato · 30k¥/persona",    color: "var(--amber-600)" },
  ]},
  { date: "30 dic", weekday: "Mer", title: "Hakone day trip", items: [
    { time: "07:30", icon: "plane",  title: "Treno per Hakone",      sub: "Shinkansen · 35 min",         color: "var(--indigo-700)" },
    { time: "10:00", icon: "spark",  title: "Onsen + Vista Fuji",    sub: "Hakone-Yumoto",               color: "var(--coral-600)" },
    { time: "18:00", icon: "bed",    title: "Rientro Tokyo",         sub: "Ryokan opzionale",            color: "var(--coral-600)" },
  ]},
  { date: "31 dic", weekday: "Gio", title: "Capodanno", items: [
    { time: "21:00", icon: "fork",   title: "Cena sukiyaki",         sub: "Ningyocho",                   color: "var(--amber-600)" },
    { time: "23:30", icon: "pin",    title: "Joya no Kane a Zojo-ji",sub: "108 rintocchi del tempio",    color: "var(--rose-600)" },
  ]},
];

export default function ItineraryPage({ proposals }: Props) {
  const decided = proposals.filter(p => computeVotes(p).total >= 5).length;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 920, margin: "0 auto" }}>
      <span className="tv-overline">// itinerario · capodanno tokyo</span>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: 20, marginTop: 6, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 600,
            letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0 }}>Otto giorni a Tokyo</h1>
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 14,
            color: "var(--ink-600)", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", gap: 5 }}><Icon name="calendar" size={13} />28 dic — 5 gen</span>
            <span style={{ display: "inline-flex", gap: 5 }}><Icon name="users" size={13} />7 amici</span>
            <span style={{ display: "inline-flex", gap: 5, color: "var(--teal-600)", fontWeight: 600 }}>
              <Icon name="check" size={13} stroke={2.5} />{decided} proposte decise
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="tv-btn tv-btn--ghost" style={{ height: 38, padding: "0 14px", fontSize: 13 }}>
            <Icon name="external" size={14} /> Esporta PDF
          </button>
          <button className="tv-btn tv-btn--primary" style={{ height: 38, padding: "0 14px", fontSize: 13 }}>
            <Icon name="calendar" size={14} /> Aggiungi a Calendar
          </button>
        </div>
      </div>

      {/* Timeline verticale */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 19, top: 22, bottom: 22,
          width: 2, background: "var(--ink-200)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {DAYS.map((day, di) => (
            <div key={di} style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
              {/* Marker data */}
              <div style={{
                width: 40, height: 40, borderRadius: 99,
                background: "var(--coral-600)", color: "#fff",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                flexShrink: 0, position: "relative", zIndex: 1,
                border: "3px solid var(--bg)", boxShadow: "var(--shadow-sm)",
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                  textTransform: "uppercase", lineHeight: 1 }}>{day.weekday}</span>
                <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
                  {day.date.split(" ")[0]}
                </span>
              </div>

              {/* Blocco giorno */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600,
                  letterSpacing: "-0.015em", marginBottom: 10, marginTop: 6 }}>
                  {day.date} — {day.title}
                </h3>
                <div className="tv-card" style={{ padding: 4 }}>
                  {day.items.map((item, ii) => (
                    <div key={ii} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                      borderBottom: ii < day.items.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <span className="tv-overline" style={{ width: 36, flexShrink: 0,
                        color: "var(--fg-muted)", textAlign: "right" }}>{item.time}</span>
                      <div style={{
                        width: 32, height: 32, borderRadius: "var(--radius-sm)", flexShrink: 0,
                        background: `${item.color}20`, color: item.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name={item.icon} size={16} stroke={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

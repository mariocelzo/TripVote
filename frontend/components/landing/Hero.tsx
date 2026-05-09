// frontend/components/landing/Hero.tsx
// Hero section con headline + CTA + floating card preview — porta da web-landing.jsx

import React from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/shared/Icon";
import { AvatarStack } from "@/components/shared/Avatar";
import { TV_PROPOSALS } from "@/lib/data";
import { computeVotes } from "@/lib/utils";

function HeroVisual() {
  const p1 = TV_PROPOSALS[0]; // Park Hyatt
  const p5 = TV_PROPOSALS[4]; // TeamLab
  const v1 = computeVotes(p1);

  return (
    <div style={{ position: "relative", height: 540 }} className="tv-hero-vis">
      <div style={{ position: "absolute", inset: -40,
        background: "radial-gradient(circle at 60% 40%, rgba(221,92,54,0.08) 0%, transparent 50%)" }} />

      {/* Card principale — Park Hyatt */}
      <div className="tv-card" style={{ position: "absolute", top: 30, right: 0, width: 340,
        overflow: "hidden", boxShadow: "var(--shadow-xl)" }}>
        <div style={{ position: "relative", height: 180 }}>
          <Image src={p1.image} alt={p1.title} fill style={{ objectFit: "cover" }} sizes="340px" />
          <div style={{ position: "absolute", bottom: 12, left: 12,
            background: "rgba(26,20,16,0.78)", color: "#fff", padding: "6px 12px",
            borderRadius: 99, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>
            {p1.price}
            <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 3 }}>{p1.priceNote}</span>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600,
            letterSpacing: "-0.02em" }}>{p1.title}</div>
          <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4 }}>{p1.subtitle}</div>
          <div style={{ display: "flex", height: 5, marginTop: 14, borderRadius: 99,
            overflow: "hidden", background: "var(--ink-200)", gap: 2 }}>
            <div style={{ width: `${v1.pctYes}%`,   background: "var(--teal-600)" }} />
            <div style={{ width: `${v1.pctMaybe}%`, background: "var(--amber-600)" }} />
            <div style={{ width: `${v1.pctNo}%`,    background: "var(--rose-600)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <AvatarStack userIds={p1.votes.yes} max={4} size={22} />
            <span style={{ fontSize: 12, color: "var(--teal-600)", fontWeight: 600 }}>
              {v1.yes} sì · {v1.maybe} forse · {v1.no} no
            </span>
          </div>
        </div>
      </div>

      {/* Chip ghost vote animato */}
      <div className="tv-card tv-pop" style={{
        position: "absolute", top: 250, right: 20,
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
        fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-lg)", width: "max-content",
      }}>
        <span style={{ fontSize: 20 }}>👍</span>
        <span>Giulia ha votato <b>Sì</b> su TeamLab Planets</span>
      </div>

      {/* Card secondaria — TeamLab */}
      <div className="tv-card" style={{ position: "absolute", bottom: 20, left: 20, width: 260,
        overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ position: "relative", height: 120 }}>
          <Image src={p5.image} alt={p5.title} fill style={{ objectFit: "cover" }} sizes="260px" />
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
            {p5.title}
          </div>
          <div style={{ display: "flex", height: 4, marginTop: 10, borderRadius: 99,
            overflow: "hidden", background: "var(--ink-200)" }}>
            <div style={{ width: "100%", background: "var(--teal-600)" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--teal-600)", fontWeight: 600, marginTop: 6 }}>
            7/7 voti · tutti d&apos;accordo 🎉
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "70px 28px 50px",
      display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 60, alignItems: "center" }}
      className="tv-hero">
      <div>
        <span className="tv-pill tv-pill--coral" style={{ marginBottom: 22 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--coral-600)",
            animation: "tv-pulse 2s infinite", display: "inline-block" }} />
          Beta · invito gratis
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 500,
          letterSpacing: "-0.035em", lineHeight: 1.02, marginTop: 18, marginBottom: 0 }}>
          Decidere il viaggio<br />
          <span style={{ color: "var(--coral-600)", fontStyle: "italic" }}>insieme</span>,
          {" "}finalmente facile.
        </h1>
        <p style={{ fontSize: 19, color: "var(--ink-600)", lineHeight: 1.5,
          marginTop: 22, maxWidth: 520 }}>
          Crea una <b style={{ color: "var(--ink-900)" }}>board condivisa</b>, manda il link
          su WhatsApp, e ognuno aggiunge proposte e vota Sì, Forse o No.{" "}
          Niente più chat di gruppo che girano a vuoto.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 30, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/app" className="tv-btn tv-btn--primary"
            style={{ height: 52, padding: "0 22px", fontSize: 15 }}>
            Crea la tua prima board
            <Icon name="chevron-right" size={16} />
          </Link>
          <button className="tv-btn tv-btn--ghost"
            style={{ height: 52, padding: "0 22px", fontSize: 15 }}>
            <Icon name="wa" size={16} /> Vedi un esempio
          </button>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 28, alignItems: "center" }}>
          <AvatarStack userIds={["u1","u2","u3","u4","u5"]} max={5} size={28} />
          <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>
            <b style={{ color: "var(--ink-900)" }}>2.840 gruppi</b> hanno già pianificato il prossimo viaggio
          </span>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}

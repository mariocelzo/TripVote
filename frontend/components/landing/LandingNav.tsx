// frontend/components/landing/LandingNav.tsx
// Navbar sticky con blur backdrop — porta da web-landing.jsx

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/app/Sidebar";

export default function LandingNav() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(248,243,236,0.85)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={30} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: 24, letterSpacing: "-0.025em" }}>TripVote</span>
        </Link>
        <nav className="tv-landing-nav" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="#come-funziona" style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-700)" }}>Come funziona</a>
          <a href="#features"      style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-700)" }}>Funzionalità</a>
          <a href="#pricing"       style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-700)" }}>Prezzi</a>
          <a href="#faq"           style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-700)" }}>FAQ</a>
          <Link href="/app" className="tv-btn tv-btn--ghost"
            style={{ height: 38, padding: "0 16px", fontSize: 13 }}>Accedi</Link>
          <Link href="/app" className="tv-btn tv-btn--primary"
            style={{ height: 38, padding: "0 18px", fontSize: 13, whiteSpace: "nowrap" }}>
            Prova gratis
          </Link>
        </nav>
      </div>
    </header>
  );
}

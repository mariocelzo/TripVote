// frontend/app/layout.tsx
// Root layout — ClerkProvider wrappa tutta l'app per la gestione sessione

import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripVote — vota il tuo viaggio",
  description: "Crea una board condivisa, invita gli amici su WhatsApp, votate insieme hotel, voli e attività.",
};

// themeColor spostato in viewport (fix warning Next.js 16)
export const viewport: Viewport = {
  themeColor: "#F8F3EC",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      {/* afterSignOutUrl: redirect a landing dopo logout — configurato qui in v7, non su UserButton */}
      <html lang="it">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

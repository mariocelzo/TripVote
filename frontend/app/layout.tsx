// frontend/app/layout.tsx
// Root layout — carica globals.css con design tokens TripVote
// I font (Inter, JetBrains Mono, Fraunces) sono caricati via @import in globals.css

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripVote — vota il tuo viaggio",
  description: "Crea una board condivisa, invita gli amici su WhatsApp, votate insieme hotel, voli e attività.",
  themeColor: "#F8F3EC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}

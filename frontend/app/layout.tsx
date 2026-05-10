// frontend/app/layout.tsx
// Root layout — nessun provider auth wrapper necessario con Supabase SSR.
// La sessione viene gestita via cookie httpOnly dal middleware e dai client server-side.

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripVote — vota il tuo viaggio",
  description:
    "Crea una board condivisa, invita gli amici su WhatsApp, votate insieme hotel, voli e attività.",
};

// themeColor in viewport (fix warning Next.js 16)
export const viewport: Viewport = {
  themeColor: "#F8F3EC",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}

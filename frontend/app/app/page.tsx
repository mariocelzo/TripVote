// frontend/app/app/page.tsx
// Entry point della web app (/app) — monta WebShell con stato globale

import WebShell from "@/components/app/WebShell";

export const metadata = {
  title: "TripVote — La tua board",
};

export default function AppPage() {
  return <WebShell />;
}

// frontend/app/login/page.tsx
// Pagina di login pubblica — usa il componente SignIn di Clerk.
// Dopo il login, Clerk reindirizza automaticamente a NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL (/app).
// La pagina non è protetta dal middleware: accessibile anche senza sessione attiva.

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    // Contenitore a schermo intero centrato, sfondo definito dalla CSS custom property --bg
    // (beige chiaro del design system TripVote, definita in globals.css)
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Clerk gestisce internamente il form di login, la validazione e il redirect post-login */}
      <SignIn />
    </div>
  );
}

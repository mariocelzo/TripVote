// frontend/app/signup/page.tsx
// Pagina di registrazione pubblica — usa il componente SignUp di Clerk.
// Dopo la registrazione, Clerk reindirizza a NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL (/app).
// La pagina non è protetta dal middleware: accessibile anche senza sessione attiva.

import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
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
      {/* Clerk gestisce internamente il form di registrazione, la validazione e il redirect post-signup */}
      <SignUp />
    </div>
  );
}

// frontend/app/signup/sso-callback/page.tsx
// Pagina callback SSO per OAuth (Google, Apple) nel flusso di signup.
// Clerk reindirizza qui dopo che il provider OAuth completa l'autenticazione.
// AuthenticateWithRedirectCallback gestisce il token e poi porta a /app.

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignUpSSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}

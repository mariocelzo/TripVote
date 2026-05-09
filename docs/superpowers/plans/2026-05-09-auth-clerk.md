# Auth Clerk Implementation Plan (Phase 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrare Clerk nel frontend Next.js 16 per gestire autenticazione (email+password, Google, Apple), proteggere `/app/*` via middleware e passare il JWT al backend FastAPI.

**Architecture:** `@clerk/nextjs` wrappa l'app in `ClerkProvider`. Un `middleware.ts` reindirizza gli utenti non autenticati da `/app/*` a `/login`. Il JWT viene estratto con `getToken()` e passato come `Authorization: Bearer` nelle fetch al BE. L'avatar mock in Sidebar viene sostituito con `<UserButton />` reale.

**Tech Stack:** `@clerk/nextjs` ^6, Next.js 16 App Router, TypeScript, Vercel CLI per le env vars.

---

## File Map

| File | Azione |
|---|---|
| `frontend/middleware.ts` | Create — protegge `/app/*` |
| `frontend/app/layout.tsx` | Modify — aggiunge `<ClerkProvider>` |
| `frontend/app/login/page.tsx` | Create — pagina `<SignIn />` |
| `frontend/app/signup/page.tsx` | Create — pagina `<SignUp />` |
| `frontend/lib/clerk.ts` | Create — helper `getAuthToken()` |
| `frontend/components/app/UserButton.tsx` | Create — avatar reale Clerk |
| `frontend/components/app/Sidebar.tsx` | Modify — sostituisce avatar mock |
| `frontend/.env.local` | Create — vars locali (mai committato) |
| `frontend/.gitignore` | Verify — `.env.local` è già ignorato |

---

## Task 1: Installa dipendenze e configura env vars

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Create: `frontend/.env.local`

- [ ] **Step 1: Installa `@clerk/nextjs`**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
npm install @clerk/nextjs
```

Output atteso: `added X packages` senza errori.

- [ ] **Step 2: Verifica che `.env.local` sia nel `.gitignore`**

```bash
grep "\.env\.local" /Users/mariocelzo/PERSONAL/TripVote/frontend/.gitignore
```

Output atteso: `.env.local` trovato. Se non c'è, aggiungilo:

```bash
echo ".env.local" >> /Users/mariocelzo/PERSONAL/TripVote/frontend/.gitignore
```

- [ ] **Step 3: Crea `frontend/.env.local` con le chiavi Clerk**

Vai su [dashboard.clerk.com](https://dashboard.clerk.com) → seleziona la tua app TripVote → "API Keys" e copia `Publishable key` e `Secret key`.

Crea il file `frontend/.env.local`:

```bash
# Clerk — Auth
# Publishable key: safe da esporre al browser (prefisso NEXT_PUBLIC_)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_SOSTITUISCI_CON_CHIAVE_REALE

# Secret key: MAI prefisso NEXT_PUBLIC_, MAI in git
CLERK_SECRET_KEY=sk_live_SOSTITUISCI_CON_CHIAVE_REALE

# URL di navigazione
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

- [ ] **Step 4: Aggiungi le stesse env vars su Vercel (production)**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend

# Publishable key — production + preview (safe, è pubblica)
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview

# Secret key — SOLO production e preview, ambiente server
vercel env add CLERK_SECRET_KEY production
vercel env add CLERK_SECRET_KEY preview

# URL di navigazione
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production <<< "/login"
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production <<< "/signup"
vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL production <<< "/app"
vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL production <<< "/app"
```

> Nota: `vercel env add` chiede interattivamente il valore — incollalo dalla dashboard Clerk quando richiesto.

- [ ] **Step 5: Verifica sicurezza — la secret key non è mai NEXT_PUBLIC_**

```bash
grep "NEXT_PUBLIC_CLERK_SECRET" /Users/mariocelzo/PERSONAL/TripVote/frontend/.env.local
```

Output atteso: nessun output (non deve esistere).

- [ ] **Step 6: Commit**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote
git add frontend/package.json frontend/package-lock.json frontend/.gitignore
git commit -m "feat(auth): installa @clerk/nextjs, aggiorna .gitignore"
```

---

## Task 2: ClerkProvider in layout + middleware

**Files:**
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Aggiorna `frontend/app/layout.tsx` con ClerkProvider**

Sostituisci il contenuto completo del file:

```tsx
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
    <ClerkProvider>
      <html lang="it">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Crea `frontend/middleware.ts`**

```ts
// frontend/middleware.ts
// Protegge tutte le route /app/* — redirect a /login se non autenticato.
// Le route pubbliche (/, /login, /signup, asset statici) non sono toccate.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Tutto sotto /app è protetto
const isProtected = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    // protect() solleva redirect a /login server-side — non bypassabile dal client
    await auth.protect();
  }
});

export const config = {
  // Escludi file statici e _next dal middleware per evitare overhead inutile
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

- [ ] **Step 3: Verifica build TypeScript**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
npm run build 2>&1 | tail -20
```

Output atteso: `✓ Compiled successfully` — nessun errore TypeScript.

- [ ] **Step 4: Commit**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote
git add frontend/app/layout.tsx frontend/middleware.ts
git commit -m "feat(auth): aggiunge ClerkProvider e middleware protezione /app/*"
```

---

## Task 3: Pagine login e signup

**Files:**
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/app/signup/page.tsx`

- [ ] **Step 1: Crea `frontend/app/login/page.tsx`**

```tsx
// frontend/app/login/page.tsx
// Pagina di login pubblica — usa il componente SignIn di Clerk.
// Dopo il login, Clerk reindirizza automaticamente a NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL (/app).

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <SignIn />
    </div>
  );
}
```

- [ ] **Step 2: Crea `frontend/app/signup/page.tsx`**

```tsx
// frontend/app/signup/page.tsx
// Pagina di registrazione pubblica — usa il componente SignUp di Clerk.
// Dopo la registrazione, Clerk reindirizza a NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL (/app).

import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 3: Verifica build**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
npm run build 2>&1 | tail -20
```

Output atteso: 5 route statiche compilate senza errori (`/`, `/app`, `/login`, `/signup`, `/_not-found`).

- [ ] **Step 4: Commit**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote
git add frontend/app/login/page.tsx frontend/app/signup/page.tsx
git commit -m "feat(auth): aggiunge pagine /login e /signup con SignIn/SignUp Clerk"
```

---

## Task 4: Helper `getAuthToken` e `UserButton`

**Files:**
- Create: `frontend/lib/clerk.ts`
- Create: `frontend/components/app/UserButton.tsx`

- [ ] **Step 1: Crea `frontend/lib/clerk.ts`**

```ts
// frontend/lib/clerk.ts
// Helper per estrarre il JWT Clerk da usare nelle chiamate al backend FastAPI.
//
// SICUREZZA:
// - getAuthToken() è usabile solo in Server Components, Route Handlers o Server Actions.
//   Il token non transita mai nel bundle JS del browser.
// - Per Client Components, usa useAuth().getToken() da @clerk/nextjs (vedi UserButton.tsx).
//
// UTILIZZO (Server Component):
//   import { getAuthToken } from "@/lib/clerk";
//   const token = await getAuthToken();
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boards/${id}/results`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });

import { auth } from "@clerk/nextjs/server";

/**
 * Restituisce il JWT Clerk da usare come Bearer nelle fetch al BE.
 * Restituisce null se l'utente non è autenticato.
 */
export async function getAuthToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}
```

- [ ] **Step 2: Crea `frontend/components/app/UserButton.tsx`**

```tsx
// frontend/components/app/UserButton.tsx
// Avatar e menu utente reale via Clerk.
// Sostituisce il mock TV_ME in Sidebar — mostra nome, avatar e permette logout.

"use client";

import { UserButton as ClerkUserButton, useUser } from "@clerk/nextjs";

export function SidebarUserButton({
  onProfile,
}: {
  onProfile: () => void;
}) {
  const { user } = useUser();

  // Nome da mostrare: display_name > primo nome > parte locale dell'email
  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "Utente";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      {/* ClerkUserButton: avatar + dropdown (gestisci account, logout) */}
      <ClerkUserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: { width: 30, height: 30 },
          },
        }}
      />
      {/* Nome cliccabile per aprire la pagina profilo */}
      <button
        onClick={onProfile}
        style={{
          display: "flex", flexDirection: "column", alignItems: "flex-start",
          background: "none", border: "none", cursor: "pointer", minWidth: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>
          {displayName}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Il mio profilo</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verifica build**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
npm run build 2>&1 | tail -10
```

Output atteso: `✓ Compiled successfully` senza errori.

- [ ] **Step 4: Commit**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote
git add frontend/lib/clerk.ts frontend/components/app/UserButton.tsx
git commit -m "feat(auth): aggiunge getAuthToken helper e SidebarUserButton Clerk"
```

---

## Task 5: Integra UserButton in Sidebar

**Files:**
- Modify: `frontend/components/app/Sidebar.tsx` (righe ~120-140, sezione profilo)

- [ ] **Step 1: Modifica la sezione profilo in `Sidebar.tsx`**

Trova il blocco `{/* Profilo + settings pinned bottom */}` (circa riga 120) e sostituiscilo:

```tsx
{/* Profilo + settings pinned bottom */}
<div style={{ display: "flex", alignItems: "center", gap: 10,
  padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
  <SidebarUserButton onProfile={() => setAppSection("profile")} />
  <button onClick={() => setAppSection("settings")} style={{
    width: 32, height: 32, borderRadius: "var(--radius-sm)",
    background: "transparent", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--fg-muted)",
  }}>
    <Icon name="settings" size={16} />
  </button>
</div>
```

- [ ] **Step 2: Aggiungi import `SidebarUserButton` in cima a `Sidebar.tsx`**

Aggiungi questa riga subito sotto gli import esistenti:

```tsx
import { SidebarUserButton } from "@/components/app/UserButton";
```

Rimuovi anche gli import non più usati dalla sezione profilo:

```tsx
// RIMUOVI questa riga se presente e non usata altrove in Sidebar.tsx:
// import { TV_ME } from "@/lib/data";
```

> Nota: controlla che `TV_ME` non sia usato altrove nel file prima di rimuoverlo.

- [ ] **Step 3: Verifica build TypeScript**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
npm run build 2>&1 | tail -15
```

Output atteso: `✓ Compiled successfully` senza errori TypeScript.

- [ ] **Step 4: Commit**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote
git add frontend/components/app/Sidebar.tsx
git commit -m "feat(auth): sostituisce avatar mock con SidebarUserButton Clerk in Sidebar"
```

---

## Task 6: Aggiunge URL BE alle env vars e deploy

**Files:**
- Nessun file codice — solo env vars Vercel e deploy

- [ ] **Step 1: Aggiungi `NEXT_PUBLIC_API_URL` a `.env.local`**

Apri `frontend/.env.local` e aggiungi in fondo:

```bash
# URL del backend FastAPI (usato da getAuthToken nelle fetch)
NEXT_PUBLIC_API_URL=https://tripvote-api.vercel.app
```

- [ ] **Step 2: Aggiungi `NEXT_PUBLIC_API_URL` su Vercel**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
vercel env add NEXT_PUBLIC_API_URL production <<< "https://tripvote-api.vercel.app"
vercel env add NEXT_PUBLIC_API_URL preview <<< "https://tripvote-api.vercel.app"
```

- [ ] **Step 3: Verifica che tutte le env vars siano presenti su Vercel**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
vercel env ls 2>&1 | grep -E "CLERK|API_URL"
```

Output atteso (almeno queste 7 righe):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   Encrypted   Production
CLERK_SECRET_KEY                    Encrypted   Production
NEXT_PUBLIC_CLERK_SIGN_IN_URL       Encrypted   Production
NEXT_PUBLIC_CLERK_SIGN_UP_URL       Encrypted   Production
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL Encrypted   Production
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL Encrypted   Production
NEXT_PUBLIC_API_URL                 Encrypted   Production
```

- [ ] **Step 4: Build finale locale**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
npm run build 2>&1 | tail -20
```

Output atteso: tutte le route compilate, nessun errore.

- [ ] **Step 5: Deploy su Vercel**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote/frontend
vercel --prod --yes 2>&1 | tail -10
```

Output atteso: `Production: https://tripvote-frontend-...vercel.app`

- [ ] **Step 6: Commit finale e push**

```bash
cd /Users/mariocelzo/PERSONAL/TripVote
git add frontend/
git commit -m "feat(auth): aggiunge NEXT_PUBLIC_API_URL env var"
git push origin main
```

---

## Task 7: Verifica manuale post-deploy

Questi test vanno eseguiti manualmente nel browser dopo il deploy.

- [ ] **Test 1: Redirect non autenticato**

  Apri `https://tripvote-frontend-...vercel.app/app` in una finestra in incognito.
  Atteso: redirect automatico a `/login`.

- [ ] **Test 2: Login email+password**

  Crea un account su `/signup`, poi fai login su `/login`.
  Atteso: redirect a `/app`, avatar reale visibile in basso a sinistra nella Sidebar.

- [ ] **Test 3: Google OAuth**

  Da `/login`, clicca "Continua con Google".
  Atteso: OAuth flow, redirect a `/app`.

- [ ] **Test 4: Apple OAuth**

  Da `/login`, clicca "Continua con Apple".
  Atteso: OAuth flow, redirect a `/app`.

- [ ] **Test 5: Logout**

  Clicca l'avatar in Sidebar → "Sign out".
  Atteso: redirect a `/` (landing).

- [ ] **Test 6: Secret key non esposta nel bundle**

  DevTools → Network → ricarica `/app` → cerca nei file JS la stringa `sk_live_`.
  Atteso: nessun risultato (la secret key è solo server-side).

- [ ] **Test 7: JWT valido per il BE**

  Da DevTools Console (con utente loggato):
  ```js
  // Clerk espone il token via window.Clerk (solo dev)
  const token = await window.Clerk.session.getToken();
  const res = await fetch('https://tripvote-api.vercel.app/boards/test/results', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(res.status); // Atteso: 404 (board non esiste) o 403, NON 401
  ```
  Un 404/403 conferma che il JWT è valido e riconosciuto dal BE.

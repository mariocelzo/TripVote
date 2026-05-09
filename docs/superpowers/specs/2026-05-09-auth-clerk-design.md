# Auth Clerk — Design Spec (Phase 2a)

**Goal:** Integrare Clerk nel frontend Next.js per gestire autenticazione (email+password, Google, Apple), protezione route e propagazione JWT al backend FastAPI.

**Architecture:** `@clerk/nextjs` wrappa l'intera app in `ClerkProvider`. Un `middleware.ts` Next.js protegge `/app/*` e reindirizza gli utenti non autenticati a `/login`. Il JWT Clerk (RS256) viene estratto lato client e passato come `Authorization: Bearer` a ogni chiamata al BE — il backend lo verifica già via JWKS (`CLERK_JWKS_URL` configurata su Vercel).

**Tech Stack:** `@clerk/nextjs` ^6, Next.js 16 App Router, TypeScript, variabili d'ambiente Vercel.

---

## File Map

| File | Azione | Responsabilità |
|---|---|---|
| `frontend/middleware.ts` | Create | Protegge `/app/*`; redirect → `/login` se sessione assente |
| `frontend/app/layout.tsx` | Modify | Aggiunge `<ClerkProvider>` come root wrapper |
| `frontend/app/login/page.tsx` | Create | Pagina pubblica con `<SignIn />` Clerk |
| `frontend/app/signup/page.tsx` | Create | Pagina pubblica con `<SignUp />` Clerk |
| `frontend/lib/clerk.ts` | Create | Helper `getAuthToken(): Promise<string \| null>` — JWT Bearer per fetch BE |
| `frontend/components/app/UserButton.tsx` | Create | `<UserButton />` Clerk + `useUser()` per avatar reale in Sidebar |
| `frontend/components/app/Sidebar.tsx` | Modify | Sostituisce avatar mock con `<UserButton />` |
| `frontend/.env.local` (locale) | Create | Variabili Clerk per sviluppo locale (mai committato) |
| `frontend/.gitignore` | Verify | Assicura che `.env.local` sia ignorato |

---

## Variabili d'ambiente

### Regole di sicurezza
- `NEXT_PUBLIC_*` è esposta al browser — solo la publishable key è safe.
- `CLERK_SECRET_KEY` non deve mai avere prefisso `NEXT_PUBLIC_` e non deve mai finire in git.
- Il middleware usa `clerkMiddleware()` che legge `CLERK_SECRET_KEY` server-side; il browser non la vede mai.
- Il JWT non viene mai salvato in `localStorage` — Clerk lo gestisce via httpOnly cookie sicuri.

### Variabili richieste

```bash
# Publishable key — safe da esporre al browser
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Secret key — SOLO server-side, mai NEXT_PUBLIC_
CLERK_SECRET_KEY=sk_live_...

# URL di navigazione (Clerk le legge automaticamente)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

### Dove configurarle
- **Locale**: `frontend/.env.local` (ignorato da git)
- **Vercel `tripvote-frontend`**: aggiunte via `vercel env add` o dashboard — `CLERK_SECRET_KEY` solo in ambiente Production/Preview, mai in plain text

---

## Middleware (`middleware.ts`)

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Route protette: tutto sotto /app
const isProtected = createRouteMatcher(['/app(.*)'])

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
```

**Sicurezza:** `auth().protect()` solleva un redirect a `/login` server-side — non è bypassabile lato client. Le route `/login`, `/signup` e tutta la landing restano pubbliche.

---

## Helper JWT (`lib/clerk.ts`)

```ts
import { auth } from '@clerk/nextjs/server'

/**
 * Restituisce il JWT Clerk da usare come Bearer nelle fetch al BE.
 * Chiamabile solo in Server Components / Route Handlers / Server Actions.
 * Restituisce null se l'utente non è autenticato.
 */
export async function getAuthToken(): Promise<string | null> {
  const { getToken } = auth()
  return getToken()
}
```

**Sicurezza:** `getToken()` viene chiamato server-side — il token non transita mai in chiaro nel bundle JS del browser. Per i Client Components che devono chiamare il BE, si usa `useAuth().getToken()` di Clerk (token a breve scadenza, refresh automatico).

---

## Flusso utente

```
Visita /app (non autenticato)
  → middleware: auth().protect()
  → redirect /login

/login
  → <SignIn /> con email+password, Google, Apple
  → Clerk setta httpOnly session cookie
  → redirect /app

/app
  → middleware: sessione valida ✓
  → Sidebar mostra avatar reale via useUser()
  → fetch al BE includono Authorization: Bearer <jwt>
```

---

## Componente UserButton

`UserButton` di Clerk fornisce: avatar, nome, menu dropdown con "Gestisci account" e "Logout". Sostituisce l'avatar mock hardcoded in `Sidebar.tsx`.

```tsx
import { UserButton, useUser } from '@clerk/nextjs'

export function SidebarUserButton() {
  const { user } = useUser()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <UserButton afterSignOutUrl="/" />
      <span style={{ fontSize: 14, fontWeight: 600 }}>
        {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}
      </span>
    </div>
  )
}
```

---

## Test da eseguire manualmente post-deploy

- [ ] Visitare `/app` da browser incognito → redirect a `/login`
- [ ] Login con email+password → redirect a `/app`
- [ ] Login con Google → redirect a `/app`
- [ ] Login con Apple → redirect a `/app`
- [ ] Logout dal UserButton → redirect a `/`
- [ ] Avatar e nome reali visibili in Sidebar
- [ ] Chiamata al BE con token valido → 200 (non 401)
- [ ] `CLERK_SECRET_KEY` non appare nel bundle JS (DevTools → Sources → cerca `sk_`)

---

## Out of scope (affrontato in Phase 2b)

- Sincronizzazione utente Clerk → tabella `public.profiles` Supabase (webhook Clerk → BE)
- Visualizzazione board reali (richiede data layer Supabase)
- Voti e realtime

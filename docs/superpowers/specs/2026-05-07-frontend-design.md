# TripVote Frontend — Design Spec
_2026-05-07_

## Overview
Implementazione pixel-perfect del design TripVote (da Claude Design) come Next.js App Router app. Fase 1: UI con mock data identica al prototipo. Fase 2 (separata): integrazione API reali.

## Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS custom properties (tokens.css identici al design, in globals.css)
- **Fonts**: Inter, JetBrains Mono, Fraunces (Google Fonts)
- **Deploy**: Vercel (stesso account del backend)
- **Auth**: Clerk (skip in fase 1, placeholder)
- **State**: React useState/useReducer (no lib esterna in fase 1)

## Struttura file
```
frontend/
  app/
    layout.tsx              ← root layout (fonts, metadata, globals.css)
    page.tsx                ← Landing page (SSR)
    app/
      layout.tsx            ← WebShell: sidebar 260px + <main> + panel 360px
      page.tsx              ← Board view (default: tokyo)
      map/page.tsx
      activity/page.tsx
      profile/page.tsx
      settings/page.tsx
      itinerary/page.tsx
      invite/page.tsx
      search/page.tsx
  components/
    landing/
      Hero.tsx
      HowItWorks.tsx
      Screenshots.tsx
      Features.tsx
      Testimonials.tsx
      Pricing.tsx
      Faq.tsx
      Footer.tsx
      LandingNav.tsx
    app/
      WebShell.tsx          ← grid 3 colonne
      Sidebar.tsx
      BoardCenter.tsx
      VotingPanel.tsx
      ProposalCard.tsx      ← full (right panel)
      CompactProposalCard.tsx ← grid
      GhostBanner.tsx
      FilterBar.tsx
    pages/
      MapPage.tsx
      ActivityPage.tsx
      ProfilePage.tsx
      SettingsPage.tsx
      ItineraryPage.tsx
      InvitePage.tsx
      SearchPage.tsx
    shared/
      Icon.tsx
      Avatar.tsx            ← single + AvatarStack
      Pill.tsx
      Btn.tsx
      VoterGroup.tsx
      VoteBar.tsx
  lib/
    data.ts                 ← mock data (da data.jsx)
    types.ts                ← Board, Proposal, User, Vote
    utils.ts                ← computeVotes, myVote, helpers
  styles/
    globals.css             ← tokens.css + reset + utilities (.tv-card, .tv-btn, ecc.)
  public/
    (immagini mock Tokyo)
```

## Pagine

### Landing (`/`)
- `LandingNav`: logo + link + CTA "Entra nell'app" → `/app`
- `Hero`: headline animata, CTA primario, mockup board preview
- `HowItWorks`: 3 step (Crea board → Invita amici → Vota)
- `Screenshots`: grid 3 screenshot (board view, mappa, add proposal)
- `Features`: griglia feature cards
- `Testimonials`: 3 quote
- `Pricing`: free tier (tutto gratis per ora)
- `FAQ`: accordion
- `Footer`: 4 colonne + copyright

### App (`/app/*`)
Layout 3 colonne fisso (260 + 1fr + 360), height 100vh.

**Sidebar** (260px):
- Logo → landing
- Btn "Nuova board"
- Nav: Board, Mappa, Attività, Cerca, Itinerario, Invita
- Lista board (con cover thumbnail)
- Profile pinned bottom + settings icon

**Centro** (1fr):
- Board: cover hero 200px + stats + filtri + grid proposal cards
- Map, Activity, Profile, Settings, Itinerary, Invite, Search

**Panel destro** (360px):
- Dettaglio proposta selezionata
- Bottoni voto (Sì/Forse/No) con animazione bounce
- Avatar stack voters
- Info prezzo/rating/link

## Componenti chiave

### ProposalCard (right panel)
- Immagine full-width 220px
- Titolo (Fraunces), sottotitolo, prezzo, rating
- Barra voti segmentata (teal/amber/rose)
- 3 bottoni voto — click → `transform: scale(1.25)` + emoji bounce (480ms spring)
- Avatar stack per ogni gruppo di voto
- Ghost banner quando arriva voto simulato

### CompactProposalCard (grid)
- Thumbnail 140px
- Pill categoria (top right)
- Price badge (bottom left)
- Titolo + sottotitolo
- Barra voti mini (4px)
- VoterGroup chips
- Bordo coral se selezionata

### GhostBanner
- Pill scura in basso al centro: "Marco ha votato 👍 su Park Hyatt Tokyo"
- Animazione fade-up + pulse dot verde
- Auto-dismiss dopo 4.5s
- Trigger ogni ~11s (mock random vote)

## Design tokens
Identici a `tokens.css` del prototipo:
- Palette: cream `#F8F3EC`, coral `#DD5C36`, teal `#149478`, amber `#C68410`, rose `#C0364B`
- Fonts: Inter (UI), JetBrains Mono (overline/codice), Fraunces (titoli display)
- Spacing: 4pt scale (s-1…s-20)
- Radii: xs 6px → 2xl 32px
- Shadows: warm rgba(60,30,10,…)
- Motion: ease-out-expo, ease-spring, dur-fast 180ms → dur-slow 480ms

## Mock data
Da `data.jsx`:
- `TV_ME`: utente corrente (Marco Bianchi)
- `TV_USERS`: 6 utenti con avatar emoji/colore
- `TV_BOARDS`: 3 board (Tokyo main, Roma, Barcellona)
- `TV_PROPOSALS`: 8 proposte Tokyo (hotel, voli, ristoranti, attività, pin)
- `TV_CAT`: categoria → label/pill/emoji/colore

## Responsive
- Desktop-first 1280+: 3 colonne
- < 980px: sidebar e panel nascosti, solo centro
- < 600px: layout mobile semplificato

## Out of scope (Fase 1)
- Autenticazione reale (Clerk)
- API calls al backend
- Supabase Realtime
- Creazione board reale
- Upload immagini

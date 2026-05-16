// frontend/lib/types.ts
// Tipi TypeScript per TripVote — porta da data.jsx + proposal-card.jsx

export type VoteKind = "yes" | "maybe" | "no";

export type ProposalType = "hotel" | "flight" | "restaurant" | "activity" | "pin";

export interface User {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Board {
  id: string;
  title: string;
  dates: string;
  cover: string;
  members: string[]; // user IDs
  proposalsCount: number;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Proposal {
  id: string;
  type: ProposalType;
  title: string;
  subtitle: string;
  image: string;
  source: string;
  price: string | null;
  priceNote?: string;
  rating?: number | null;
  ratingCount?: number;
  addedBy: string; // user ID
  addedAt: string;
  location?: Location;
  note?: string;
  votes: {
    yes:   string[]; // user IDs
    maybe: string[];
    no:    string[];
  };
  isNew: boolean;
  // Campo opzionale proveniente dal BE: true se la proposta ha raggiunto il consenso (match)
  isMatch?: boolean;
}

export interface Category {
  label: string;
  pill: string;  // classe CSS es. "tv-pill--coral"
  icon: string;  // nome icona
}

export interface VoteDistribution {
  yes: number;
  maybe: number;
  no: number;
  total: number;
  pctYes: number;
  pctMaybe: number;
  pctNo: number;
}

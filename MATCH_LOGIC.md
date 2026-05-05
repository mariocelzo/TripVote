# Match Logic

> Definisce **quando una proposta vince** all'interno di una board. Tutta la logica vive in `app/services/match.py` ed è testata in `tests/test_match.py`.

## TL;DR

Una proposta è "match" quando:

1. Ha raggiunto il **quorum**: almeno il 50% dei membri della board ha votato su questa proposta.
2. Il suo **score pesato** è ≥ 0.7.
3. La board è ancora `status = 'open'` (le board chiuse non producono nuovi match).

I parametri (50%, 0.7) sono **configurabili** sia globalmente (env vars) sia per singola board (campo `boards.match_config jsonb`).

---

## Formula

Per ogni proposta:

```
score = (yes_count * 1.0 + maybe_count * 0.5 + no_count * 0.0) / total_votes
```

dove `total_votes = yes_count + maybe_count + no_count`.

Il quorum si misura sui **votanti distinti per quella proposta**, non sui votanti totali della board:

```
quorum_ratio = total_votes / members_count
```

Una proposta è match se:

```
quorum_ratio >= QUORUM_THRESHOLD  AND  score >= SCORE_THRESHOLD
```

Default: `QUORUM_THRESHOLD = 0.5`, `SCORE_THRESHOLD = 0.7`.

## Esempi

Board con **6 membri**.

| # | Sì | Forse | No | Total | Quorum | Score | Match? |
|---|---|---|---|---|---|---|---|
| 1 | 4 | 1 | 0 | 5 | 0.83 ✓ | 0.90 ✓ | ✅ Sì |
| 2 | 3 | 0 | 0 | 3 | 0.50 ✓ | 1.00 ✓ | ✅ Sì |
| 3 | 2 | 1 | 1 | 4 | 0.66 ✓ | 0.625 ✗ | ❌ No (score basso) |
| 4 | 2 | 0 | 0 | 2 | 0.33 ✗ | 1.00 ✓ | ❌ No (no quorum) |
| 5 | 0 | 6 | 0 | 6 | 1.00 ✓ | 0.50 ✗ | ❌ No (tutti "Forse") |

## Proprietà importanti

- **Monotonia**: aggiungere un voto Sì non può far perdere lo status di match a una proposta.
- **Determinismo**: dato lo stesso set di voti, lo stato di match è sempre lo stesso (nessun random).
- **Idempotenza**: chiamare `compute_match()` due volte di fila produce lo stesso risultato.

## Tie-breaking

Se più proposte sono match contemporaneamente, vengono ordinate (in `GET /boards/{id}/results.winners`) per:

1. **Score discendente**.
2. A parità di score, **`yes_count` discendente**.
3. A parità di entrambi, **`created_at` ascendente** (vince chi l'ha proposta prima — premia la prontezza).

Non c'è "un solo vincitore": una board può avere `winner` per categoria (un hotel + un volo + due attività). Il FE può raggruppare per `category` se vuole.

## Configurazione

### Globale (env)

```
MATCH_QUORUM_THRESHOLD=0.5
MATCH_SCORE_THRESHOLD=0.7
MATCH_YES_WEIGHT=1.0
MATCH_MAYBE_WEIGHT=0.5
MATCH_NO_WEIGHT=0.0
```

### Per board (override)

Campo `boards.match_config jsonb`. Esempio:

```json
{
  "quorum_threshold": 0.66,
  "score_threshold": 0.8,
  "weights": { "yes": 1.0, "maybe": 0.3, "no": -0.5 }
}
```

Se assente o vuoto, si usano i default globali. Lo schema è già contemplato nella migration 0001.

> ⚠️ Pesi negativi (es. `no = -0.5`) sono ammessi per simulare un sistema "veto-aware". In quel caso lo score è clampato a `[0, 1]` prima del confronto con la threshold.

## Quando viene calcolato

- **Lazy** (lettura): `GET /boards/{id}/results` legge i conteggi dalla view `proposal_results` e calcola al volo (è O(n) sulle proposte della board, irrilevante).
- **Eager** (scrittura): il webhook `/internal/cache/invalidate-vote` ricalcola dopo ogni voto e, se rileva una **transizione da non-match → match**, scatena la notifica email via `notifications.match`.

## Stato persistito

Per evitare di mandare la stessa notifica due volte, persistiamo lo stato di match:

```sql
-- aggiunto in 0001_init.sql
alter table public.proposals
  add column matched_at timestamptz;
```

- Quando una proposta diventa match → `matched_at = now()` e parte la notifica.
- Quando una proposta perde lo status di match (es. un membro ritira il Sì) → `matched_at = null`. Niente notifica al "de-match" (rumoroso).
- Il FE può mostrare un indicatore "Match!" basato sulla presenza di `matched_at`.

## Edge cases

1. **`members_count = 0`**: impossibile (l'owner è sempre membro), ma per safety `quorum_ratio = 0` → mai match.
2. **`total_votes = 0`**: score = 0 → mai match.
3. **Membro che rimuove il proprio voto**: `value = 0` non significa "rimuovi", significa "Forse". Per rimuovere usa `DELETE` su `votes`. La logica si comporta correttamente in entrambi i casi.
4. **Membro rimosso dalla board** dopo aver votato: il voto resta in DB. Decisione di prodotto: **i voti restano**, il `members_count` cala. Quindi una proposta può mantenere il quorum anche se l'autore del voto se n'è andato. Cambiare richiede una FK on-delete o un trigger; lo facciamo solo se diventa un problema.

## Test (in `tests/test_match.py`)

Casi minimi obbligatori:

- I 5 esempi della tabella sopra.
- Override per board con `match_config` custom.
- Pesi negativi con clamp.
- Idempotenza: due chiamate consecutive.
- Transizione `matched_at` (None → datetime → None).

---

> Se cambiamo idea e vogliamo ranked-choice o weighted Borda count, è isolato a `app/services/match.py` — il resto dell'app non se ne accorge.

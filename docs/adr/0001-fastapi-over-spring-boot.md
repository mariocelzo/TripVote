# ADR 0001 — FastAPI over Spring Boot per il backend

- **Status**: Accepted
- **Date**: 2026-05-05
- **Context owner**: Mario Celzo

## Contesto

Il backend di TripVote serve due tipi di carico:

1. **Logica leggera CRUD-aggregativa** (qualche query, validazione, risposta JSON).
2. **Scraping di link preview** da Booking, Skyscanner, ecc. — operazioni I/O-bound che possono durare anche 5-8 secondi.

Il vincolo è girare su un **Droplet DigitalOcean da $6/mese (1 GB RAM, 1 vCPU)** sfruttando i 200$ del GitHub Student Pack come budget pluriennale. Il candidato sviluppatore conosce sia Python che Java.

## Opzioni considerate

### Opzione A — FastAPI (Python 3.12)
- Memoria container a riposo: ~100 MB.
- Cold start: <1s.
- Scraping: ecosistema dominante (`httpx`, `BeautifulSoup`, `opengraph-py3`, `playwright`).
- Async I/O nativo via `uvicorn` + `asyncio`.
- Tipizzazione: Pydantic v2 (eccellente).

### Opzione B — Spring Boot (Java 21)
- Memoria container a riposo: ~400-600 MB.
- Cold start: 5-15s.
- Scraping: possibile via `jsoup` ma scomodo, niente equivalente diretto di `opengraph-py3`.
- Async via WebFlux/Reactor (più complesso da padroneggiare).
- Tipizzazione: Bean Validation (eccellente).
- "Segnale CV": forte in ambito enterprise.

### Opzione C — Node.js / NestJS
- Memoria intermedia (~200 MB).
- Scraping decente (`cheerio`, `puppeteer`).
- Scartato per non aggiungere un terzo runtime al progetto: il FE è già JS/TS.

## Decisione

**Adottiamo FastAPI.**

## Conseguenze positive

- Su 1 GB RAM, FastAPI gira comodo. Spring Boot dovrebbe salire al droplet $12 (2 GB), bruciando il credito in metà tempo (~16 mesi vs ~33 mesi).
- Ecosistema scraping diretto: il caso d'uso n.2 si risolve in poche righe.
- Pydantic v2 ci dà validation + serialization gratis su tutte le rotte.
- Ciclo di sviluppo veloce: hot reload via `uvicorn --reload`.

## Conseguenze negative / trade-off

- Perdiamo il "segnale CV" Java enterprise. Lo compensiamo con la qualità dell'architettura (RLS, CI/CD, monitoring).
- Single-process per worker: per CPU-bound dovremmo aggiungere un Celery/RQ. Per ora il carico CPU è trascurabile.
- Pacchetti Python di scraping richiedono build deps (libxml, libxslt) → Dockerfile multi-stage per non gonfiare l'immagine.

## Quando rivedere

- Se aggiungiamo logica fortemente CPU-bound (es. AI inference local) → considerare un sidecar in Go/Rust.
- Se la team cresce e arriva un mid Java → considerare Spring Boot per un nuovo microservizio dedicato.
- Se il droplet diventa stretto → migrare a un piano con più RAM, non cambiare runtime.

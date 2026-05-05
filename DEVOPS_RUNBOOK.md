# DevOps Runbook — Bootstrap del Droplet & Deploy

> Questa è la guida one-time per portare TripVote da "repo + Supabase pronti" a "API live su `https://api.tripvote.me`".
> Tempo stimato: 30-45 minuti la prima volta.

## 1. Pre-requisiti

- Account DigitalOcean attivato con i 200$ del GitHub Pack ([istruzioni](https://education.github.com/pack)).
- Dominio `tripvote.me` (o quello che hai scelto) registrato via Namecheap/Name.com del Pack.
- Repo GitHub privato del progetto.
- Account Supabase con il progetto creato e le migration applicate.
- Account Upstash con un Redis database creato.
- Account SendGrid con una API key e un mittente verificato (`noreply@tripvote.me`).
- Account Sentry con un progetto FastAPI.

## 2. Crea il Droplet

1. DigitalOcean → **Create → Droplet**.
2. Image: **Ubuntu 24.04 LTS x64**.
3. Size: **Basic shared CPU, $6/mese (1 GB RAM, 1 vCPU, 25 GB SSD)**. È sufficiente per TripVote MVP.
4. Datacenter: **Frankfurt** (latenza bassa per utenti EU + GDPR-friendly).
5. Authentication: **SSH key** (carica la tua public key, niente password).
6. Hostname: `tripvote-api-prod`.
7. Backup: opzionale ($1.20/mese). Per ora skip — i dati veri stanno su Supabase.
8. Crea il droplet, segna l'**IP pubblico**.

## 3. Hardening del server (essenziale)

Connettiti come root:

```bash
ssh root@<IP>
```

### 3.1 Crea utente `deploy` non-root

```bash
adduser deploy --disabled-password
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# concedi sudo senza password (necessario per docker)
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy
```

### 3.2 Disabilita login SSH come root

```bash
sed -i 's/^#*PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Da ora connettiti come `ssh deploy@<IP>`.

### 3.3 Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 3.4 Fail2ban (basta il default)

```bash
sudo apt update && sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

### 3.5 Auto-update di sicurezza

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 4. Installa Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
newgrp docker
docker run hello-world  # sanity check
```

Installa il plugin compose (di solito già incluso, verifica):

```bash
docker compose version
```

## 5. DNS — punta `api.tripvote.me` al Droplet

Sul tuo registrar (Namecheap/Name.com):

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `api` | `<IP del Droplet>` | 300 |
| A | `@` | `<IP Vercel o ALIAS>` | 300 |
| CNAME | `www` | `cname.vercel-dns.com.` | 300 |

Aspetta ~5 min e verifica:

```bash
dig +short api.tripvote.me
# deve restituire l'IP del Droplet
```

## 6. Layout sul Droplet

```bash
sudo mkdir -p /opt/tripvote
sudo chown deploy:deploy /opt/tripvote
cd /opt/tripvote
```

Carica i file da `infra/` del repo: `docker-compose.yml` e `Caddyfile`.

```bash
# Da locale, dalla root del repo:
scp infra/docker-compose.yml deploy@<IP>:/opt/tripvote/
scp infra/Caddyfile deploy@<IP>:/opt/tripvote/
```

## 7. Crea il file `.env` di produzione sul server

> ⚠️ Questo file contiene **tutti i secret di produzione**. Non committarlo mai. Permessi `600`.

```bash
ssh deploy@<IP>
cd /opt/tripvote
nano .env
```

Contenuto (riempi i valori reali):

```bash
ENV=production
LOG_LEVEL=INFO

# Supabase (production)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
SUPABASE_WEBHOOK_SECRET=<genera con: openssl rand -hex 32>

# Upstash Redis
REDIS_URL=rediss://default:...@...upstash.io:6379

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@tripvote.me

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# Match
MATCH_QUORUM_THRESHOLD=0.5
MATCH_SCORE_THRESHOLD=0.7

# Cron
CRON_SECRET=<openssl rand -hex 32>
```

Permessi:

```bash
chmod 600 .env
```

## 8. Login GHCR + primo pull

Crea un Personal Access Token GitHub con scope `read:packages` (Settings → Developer settings → Personal access tokens → Fine-grained → "Packages: read"). Poi:

```bash
echo "<GHCR_TOKEN>" | docker login ghcr.io -u <github-username> --password-stdin
```

## 9. Primo deploy (manuale)

Prima di automatizzare, fai un giro a mano per essere sicuro che tutto torni:

```bash
cd /opt/tripvote
docker compose pull
docker compose up -d
docker compose ps           # tutti "Up"
docker compose logs -f api  # tail dei log
```

Verifica:

```bash
curl https://api.tripvote.me/health
# {"status":"ok","version":"...","uptime_seconds":...}
```

Se Caddy ha generato il certificato Let's Encrypt correttamente, il TLS funziona out-of-the-box.

## 10. Imposta i secret per GitHub Actions

Vai su `https://github.com/<user>/tripvote/settings/secrets/actions` e aggiungi:

| Nome | Valore |
|---|---|
| `DO_HOST` | IP del Droplet |
| `DO_USER` | `deploy` |
| `DO_SSH_KEY` | la tua **private** SSH key (intero contenuto del file) |
| `GHCR_TOKEN` | PAT con scope `read:packages` |

Da ora ogni `git push` su `main` con modifiche in `backend/` deploya automaticamente.

## 11. Configura i Database Webhook su Supabase

Supabase Studio → **Database → Webhooks → Create**:

1. Nome: `invalidate_vote_cache`
2. Tabella: `votes`
3. Eventi: `INSERT, UPDATE, DELETE`
4. Type: HTTP Request
5. Method: POST
6. URL: `https://api.tripvote.me/internal/cache/invalidate-vote`
7. HTTP Headers:
   - `X-Webhook-Secret`: stesso valore del `SUPABASE_WEBHOOK_SECRET` nell'`.env`.

Salva. Test: vota qualcosa dal FE/Studio e controlla i log del BE — dovresti vedere il webhook arrivare.

## 12. Cap di spesa su DigitalOcean

DigitalOcean → **Settings → Billing → Billing Alerts**.
Imposta alert via email a:

- 50$ usati (il droplet a $6/mese ti dura ~33 mesi, ma meglio avvisati)
- 100$
- 150$

## 13. Backup

Free tier Supabase: backup giornaliero ritenuto 7 giorni. **Per i progetti che cresceranno**, aggiungi un cron sul Droplet che fa `pg_dump` e lo carica su Supabase Storage o B2 (Backblaze ha il free tier 10GB).

```bash
# /opt/tripvote/backup.sh — placeholder, da implementare quando serve
0 4 * * * pg_dump $SUPABASE_DB_URL | gzip > /tmp/tripvote-$(date +\%F).sql.gz && \
          rclone copy /tmp/tripvote-$(date +\%F).sql.gz b2:tripvote-backups/
```

## 14. Monitoring "operations dashboard"

- **Sentry** → notifica via email su issue nuove o regressioni.
- **DigitalOcean Monitoring** (gratis) → CPU/RAM/disk del Droplet.
- **Uptime Robot** (free tier) → ping ogni 5 min su `api.tripvote.me/health`.

## 15. Checklist post-deploy

- [ ] `https://api.tripvote.me/health` risponde 200.
- [ ] `https://api.tripvote.me/docs` (Swagger) accessibile.
- [ ] DNS `api.tripvote.me` punta al Droplet.
- [ ] Cert TLS Let's Encrypt valido (controlla con `curl -vI` o sslshopper.com).
- [ ] Webhook Supabase test: voto → cache invalidata.
- [ ] Sentry riceve un errore di test (`/debug-sentry` se ne implementi uno).
- [ ] GitHub Actions: workflow verde su un push fittizio.
- [ ] Cap di spesa DigitalOcean impostato.
- [ ] Uptime Robot configurato.

## Procedure operative

### Rollback a una versione precedente

```bash
ssh deploy@<IP>
cd /opt/tripvote
docker compose pull api:<sha-precedente>  # tag di un build precedente
sed -i 's|tripvote-api:latest|tripvote-api:<sha>|' docker-compose.yml
docker compose up -d api
```

### Restart di emergenza

```bash
ssh deploy@<IP>
cd /opt/tripvote && docker compose restart api
```

### Vedere i log

```bash
ssh deploy@<IP>
docker compose logs -f api          # tail live
docker compose logs --tail=200 api  # ultimi 200
```

### Spazio disco pieno

```bash
docker system df            # cosa occupa cosa
docker image prune -a -f    # rimuove immagini non usate
docker container prune -f
```

### SSH keys per altri sviluppatori

```bash
ssh deploy@<IP>
echo "ssh-ed25519 AAAA... new-dev" >> ~/.ssh/authorized_keys
```

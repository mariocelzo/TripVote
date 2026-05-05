# =====================================================================
# TripVote backend — production image
# Multi-stage build: ~150 MB finale, no toolchain residuo
# =====================================================================

# ---- Base ----------------------------------------------------------
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

# Pacchetti di sistema essenziali (curl per healthcheck, libxml per lxml)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl libxml2 libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

# ---- Build deps -----------------------------------------------------
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libxml2-dev libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# ---- Runtime --------------------------------------------------------
FROM base AS runtime

# Crea utente non-root
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

# Copia le dipendenze installate
COPY --from=deps /install /usr/local

# Copia il codice
COPY --chown=app:app ./app ./app

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*"]

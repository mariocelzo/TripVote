# Entry point per Vercel Serverless Functions.
# Vercel cerca automaticamente `api/index.py` e vi espone l'ASGI app.
# Tutto il routing è delegato a FastAPI tramite vercel.json.
from app.main import app  # noqa: F401 — Vercel usa questa variabile "app"

# Link preview scraper: httpx + BeautifulSoup + Open Graph.
# Cache Redis TTL 1h per URL identiche linkate da più membri.
import hashlib
import json
import logging
import re

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.core.redis import get_redis
from app.core.ssrf import SSRFError, assert_public_url
from app.schemas.proposals import PreviewResponse

logger = logging.getLogger(__name__)

_CACHE_TTL = 3600  # 1 ora
_MAX_REDIRECTS = 5  # quante 3xx seguire prima di arrenderci
_MAX_BYTES = 2_000_000  # 2 MB: basta per <head>, evita di scaricare file enormi
_PRICE_RE = re.compile(r"[\d]+(?:[.,]\d{1,2})?")


def _extract_price_cents(
    value: str | None, currency_hint: str | None = None
) -> tuple[int | None, str | None]:
    """Converte stringa prezzo in centesimi. Ritorna (price_cents, currency)."""
    if not value:
        return None, currency_hint
    match = _PRICE_RE.search(value.replace(",", "."))
    if not match:
        return None, currency_hint
    try:
        euros = float(match.group())
        return int(round(euros * 100)), currency_hint or "EUR"
    except ValueError:
        return None, currency_hint


def _parse_html(html: str) -> PreviewResponse:
    """Estrae metadati OG da HTML con fallback su <title> e <meta name>."""
    soup = BeautifulSoup(html, "lxml")

    def og(prop: str) -> str | None:
        tag = soup.find("meta", attrs={"property": prop})
        return tag["content"].strip() if tag and tag.get("content") else None  # type: ignore[index]

    def meta(name: str) -> str | None:
        tag = soup.find("meta", attrs={"name": name})
        return tag["content"].strip() if tag and tag.get("content") else None  # type: ignore[index]

    title = og("og:title") or (soup.title.string.strip() if soup.title else None)
    description = og("og:description") or meta("description")
    image_url = og("og:image")
    site_name = og("og:site_name")

    raw_price = og("og:price:amount") or og("product:price:amount")
    raw_currency = og("og:price:currency") or og("product:price:currency")
    price_cents, currency = _extract_price_cents(raw_price, raw_currency)

    return PreviewResponse(
        title=title,
        description=description,
        image_url=image_url,
        site_name=site_name,
        price_cents=price_cents,
        currency=currency,
    )


async def _fetch_with_ssrf_guard(url: str) -> httpx.Response:
    """
    Scarica un URL seguendo i redirect MANUALMENTE, validando ogni hop con il
    guard SSRF. Disabilitiamo follow_redirects di httpx perché un redirect 3xx
    verso un IP interno bypasserebbe un controllo fatto solo sull'URL iniziale.

    Limita anche la dimensione del corpo scaricato per evitare abusi.
    """
    current = url
    async with httpx.AsyncClient(
        timeout=8.0,
        follow_redirects=False,  # li seguiamo noi, validando ogni destinazione
        headers={"User-Agent": "TripVote-Bot/1.0 (+https://tripvote.me)"},
    ) as client:
        for _ in range(_MAX_REDIRECTS + 1):
            # Valida PRIMA di ogni richiesta (URL iniziale e ogni Location)
            try:
                assert_public_url(current)
            except SSRFError as exc:
                logger.warning("SSRF bloccato per %s: %s", current, exc)
                raise HTTPException(status_code=400, detail="URL non consentito") from exc

            try:
                response = await client.get(current)
            except httpx.HTTPError as exc:
                logger.warning("Scraping fallito per %s: %s", current, exc)
                raise HTTPException(
                    status_code=400, detail=f"URL non raggiungibile: {exc}"
                ) from exc

            # Redirect? Risolvi la Location e ricomincia il ciclo (rivalidando)
            if response.is_redirect and "location" in response.headers:
                current = str(response.url.join(response.headers["location"]))
                continue

            if response.status_code >= 500:
                raise HTTPException(502, detail=f"Il sito ha risposto con {response.status_code}")
            if response.status_code >= 400:
                raise HTTPException(400, detail=f"Il sito ha risposto con {response.status_code}")

            # Rifiuta corpi troppo grandi (header Content-Length, se presente)
            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > _MAX_BYTES:
                raise HTTPException(status_code=400, detail="Pagina troppo grande")

            return response

    # Troppi redirect a catena
    raise HTTPException(status_code=400, detail="Troppi redirect")


async def scrape_link_preview(url: str) -> PreviewResponse:
    """
    Scarica e parsa i metadati OG di un URL.
    Cache Redis key: preview:<sha1(url)>, TTL 1h.
    Degrada gracefully se Redis è down.
    """
    cache_key = f"preview:{hashlib.sha1(url.encode()).hexdigest()}"  # noqa: S324

    try:
        redis = get_redis()
        cached = await redis.get(cache_key)
        if cached:
            return PreviewResponse(**json.loads(cached))
    except Exception as cache_exc:
        logger.debug("Cache miss (Redis down?): %s", cache_exc)

    response = await _fetch_with_ssrf_guard(url)

    content_type = response.headers.get("content-type", "")
    if "html" not in content_type:
        raise HTTPException(status_code=400, detail="URL non punta a una pagina HTML")

    result = _parse_html(response.text)

    try:
        redis = get_redis()
        await redis.set(cache_key, result.model_dump_json(), ex=_CACHE_TTL)
    except Exception as cache_exc:
        logger.debug("Cache write fallita (Redis down?): %s", cache_exc)

    return result

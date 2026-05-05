from fastapi import APIRouter, Depends

from app.api.deps import rate_limit
from app.core.auth import get_current_user
from app.schemas.proposals import PreviewRequest, PreviewResponse
from app.services.scraper import scrape_link_preview

router = APIRouter()


@router.post("/preview", response_model=PreviewResponse)
async def preview_url(
    body: PreviewRequest,
    user: dict = Depends(get_current_user),
) -> PreviewResponse:
    """
    Estrae metadati Open Graph da un URL per popolare la card della proposta.
    Rate limit: 20 req/min per utente.
    """
    await rate_limit(user["id"], "preview", max_per_window=20, window_seconds=60)
    return await scrape_link_preview(body.url)

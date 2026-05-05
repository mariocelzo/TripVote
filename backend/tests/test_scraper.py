import pytest
from fastapi import HTTPException
from pytest_httpx import HTTPXMock

BOOKING_HTML = """
<html>
<head>
  <meta property="og:title" content="Hotel Roma Centro" />
  <meta property="og:description" content="Bellissimo hotel" />
  <meta property="og:image" content="https://example.com/img.jpg" />
  <meta property="og:site_name" content="Booking.com" />
  <meta property="og:price:amount" content="120.50" />
  <meta property="og:price:currency" content="EUR" />
</head>
<body></body>
</html>
"""

MINIMAL_HTML = """
<html><head><title>Solo titolo</title></head><body></body></html>
"""


@pytest.fixture(autouse=True)
def _mock_redis(mocker):
    """Bypassa Redis nei test dello scraper."""
    mocker.patch("app.services.scraper.get_redis", side_effect=RuntimeError("no redis"))


@pytest.mark.asyncio
async def test_scrape_full_opengraph(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://www.booking.com/hotel/it/example.html",
        text=BOOKING_HTML,
        headers={"content-type": "text/html; charset=utf-8"},
    )
    from app.services.scraper import scrape_link_preview

    result = await scrape_link_preview("https://www.booking.com/hotel/it/example.html")
    assert result.title == "Hotel Roma Centro"
    assert result.description == "Bellissimo hotel"
    assert result.image_url == "https://example.com/img.jpg"
    assert result.site_name == "Booking.com"
    assert result.price_cents == 12050
    assert result.currency == "EUR"


@pytest.mark.asyncio
async def test_scrape_fallback_title(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://example.com/page",
        text=MINIMAL_HTML,
        headers={"content-type": "text/html"},
    )
    from app.services.scraper import scrape_link_preview

    result = await scrape_link_preview("https://example.com/page")
    assert result.title == "Solo titolo"
    assert result.image_url is None


@pytest.mark.asyncio
async def test_scrape_http_error(httpx_mock: HTTPXMock):
    import httpx

    httpx_mock.add_exception(
        httpx.ConnectError("connection refused"),
        url="https://unreachable.example.com/",
    )
    from app.services.scraper import scrape_link_preview

    with pytest.raises(HTTPException) as exc:
        await scrape_link_preview("https://unreachable.example.com/")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_scrape_bad_status_404(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url="https://example.com/404", status_code=404)
    from app.services.scraper import scrape_link_preview

    with pytest.raises(HTTPException) as exc:
        await scrape_link_preview("https://example.com/404")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_scrape_bad_status_500(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url="https://example.com/err", status_code=500)
    from app.services.scraper import scrape_link_preview

    with pytest.raises(HTTPException) as exc:
        await scrape_link_preview("https://example.com/err")
    assert exc.value.status_code == 502


@pytest.mark.asyncio
async def test_scrape_non_html(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url="https://example.com/file.pdf",
        status_code=200,
        headers={"content-type": "application/pdf"},
        content=b"%PDF-1.4",
    )
    from app.services.scraper import scrape_link_preview

    with pytest.raises(HTTPException) as exc:
        await scrape_link_preview("https://example.com/file.pdf")
    assert exc.value.status_code == 400

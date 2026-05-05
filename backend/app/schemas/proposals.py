from pydantic import BaseModel, field_validator


class PreviewRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL deve iniziare con http:// o https://")
        return v


class PreviewResponse(BaseModel):
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    price_cents: int | None = None
    currency: str | None = None
    site_name: str | None = None
    lat: float | None = None
    lng: float | None = None

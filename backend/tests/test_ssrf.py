# tests/test_ssrf.py
# Test del guard SSRF: lo scraper non deve poter raggiungere indirizzi interni
# (metadata cloud, localhost, reti private) tramite URL forniti dall'utente.

import pytest

from app.core.ssrf import SSRFError, assert_public_url


class _FakeResolver:
    """Risolutore DNS finto: mappa hostname → lista di IP, per test deterministici."""

    def __init__(self, mapping: dict[str, list[str]]):
        self._mapping = mapping

    def __call__(self, host: str) -> list[str]:
        if host not in self._mapping:
            raise SSRFError(f"host non risolvibile: {host}")
        return self._mapping[host]


def test_blocks_non_http_scheme():
    with pytest.raises(SSRFError):
        assert_public_url("ftp://example.com/file")


def test_blocks_file_scheme():
    with pytest.raises(SSRFError):
        assert_public_url("file:///etc/passwd")


def test_blocks_missing_host():
    with pytest.raises(SSRFError):
        assert_public_url("http:///path-only")


def test_blocks_cloud_metadata_ip():
    # 169.254.169.254 = endpoint metadata AWS/GCP/Azure
    resolver = _FakeResolver({"metadata.evil": ["169.254.169.254"]})
    with pytest.raises(SSRFError):
        assert_public_url("http://metadata.evil/latest/meta-data/", resolve=resolver)


def test_blocks_localhost():
    resolver = _FakeResolver({"localhost": ["127.0.0.1"]})
    with pytest.raises(SSRFError):
        assert_public_url("http://localhost:8000/internal", resolve=resolver)


def test_blocks_private_10_range():
    resolver = _FakeResolver({"intranet.local": ["10.0.0.5"]})
    with pytest.raises(SSRFError):
        assert_public_url("http://intranet.local/admin", resolve=resolver)


def test_blocks_private_192_168_range():
    resolver = _FakeResolver({"router.home": ["192.168.1.1"]})
    with pytest.raises(SSRFError):
        assert_public_url("http://router.home", resolve=resolver)


def test_blocks_literal_private_ip_without_dns():
    # IP literal: nessun DNS, ma deve comunque essere bloccato
    with pytest.raises(SSRFError):
        assert_public_url("http://127.0.0.1/")


def test_blocks_ipv6_loopback():
    with pytest.raises(SSRFError):
        assert_public_url("http://[::1]/")


def test_blocks_if_any_resolved_ip_is_private():
    # DNS rebinding: un host pubblico che risolve anche a un IP privato → blocca
    resolver = _FakeResolver({"sneaky.com": ["1.2.3.4", "10.0.0.1"]})
    with pytest.raises(SSRFError):
        assert_public_url("http://sneaky.com/", resolve=resolver)


def test_allows_public_host():
    resolver = _FakeResolver({"www.booking.com": ["104.18.0.1"]})
    # Non deve sollevare eccezioni
    assert_public_url("https://www.booking.com/hotel", resolve=resolver)


def test_allows_public_ip_literal():
    assert_public_url("https://104.18.0.1/")

# backend/app/core/ssrf.py
# Guard contro SSRF (Server-Side Request Forgery).
#
# Lo scraper di link preview scarica URL forniti dall'utente lato server.
# Senza controlli, un utente potrebbe far chiamare al backend indirizzi interni:
#   - http://169.254.169.254/  → metadata cloud (credenziali IAM su AWS/GCP/Azure)
#   - http://localhost:6379/    → Redis, Postgres, altri servizi interni
#   - http://10.0.0.x/          → rete privata della VPC
#
# Questo modulo valida che un URL punti a un host PUBBLICO prima di scaricarlo,
# risolvendo il DNS e controllando OGNI IP restituito (difesa anche da DNS rebinding).

import ipaddress
import socket
from collections.abc import Callable
from urllib.parse import urlsplit

# Schemi consentiti: solo HTTP/HTTPS. Blocca file://, ftp://, gopher://, ecc.
_ALLOWED_SCHEMES = frozenset({"http", "https"})


class SSRFError(ValueError):
    """Sollevata quando un URL non è sicuro da scaricare lato server."""


def _default_resolve(host: str) -> list[str]:
    """
    Risolve un hostname in tutti i suoi indirizzi IP (v4 e v6).
    Separato dalla logica di validazione per essere mockabile nei test.
    """
    try:
        # getaddrinfo restituisce tutte le famiglie/indirizzi configurati
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise SSRFError(f"host non risolvibile: {host}") from exc
    # Estrae gli IP unici (indice 4 = sockaddr, primo elemento = indirizzo)
    return list({info[4][0] for info in infos})


def _is_public_ip(ip_str: str) -> bool:
    """
    True solo se l'IP è un indirizzo pubblico instradabile.
    Blocca loopback, reti private, link-local (incl. 169.254.169.254),
    multicast, riservati e non specificati.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    # is_global è False per private/loopback/link-local/reserved/multicast.
    # Aggiungiamo controlli espliciti per robustezza tra versioni di Python.
    return ip.is_global and not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def assert_public_url(
    url: str,
    resolve: Callable[[str], list[str]] | None = None,
) -> None:
    """
    Verifica che `url` sia sicuro da scaricare lato server.
    Solleva SSRFError se lo schema non è http(s), se manca l'host,
    o se l'host risolve (anche solo in parte) a un indirizzo non pubblico.

    `resolve` è iniettabile per i test; di default usa il DNS reale.
    """
    resolver = resolve or _default_resolve

    parts = urlsplit(url)
    if parts.scheme not in _ALLOWED_SCHEMES:
        raise SSRFError(f"schema non consentito: {parts.scheme or '(vuoto)'}")

    host = parts.hostname
    if not host:
        raise SSRFError("URL senza host")

    # Se l'host è già un IP literal, validalo direttamente (niente DNS)
    try:
        ipaddress.ip_address(host)
        ip_list = [host]
    except ValueError:
        # Hostname → risolvi via DNS e controlla ogni IP restituito
        ip_list = resolver(host)
        if not ip_list:
            raise SSRFError(f"host non risolvibile: {host}") from None

    for ip in ip_list:
        if not _is_public_ip(ip):
            raise SSRFError(f"indirizzo non pubblico bloccato: {ip}")

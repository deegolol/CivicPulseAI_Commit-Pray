"""Client IP behind Railway's proxy, for rate limits.

X-Forwarded-For is "client, proxy1, proxy2…": the LEFTMOST value is whatever the client sent (spoofable);
the RIGHTMOST one is appended by Railway's edge proxy, so that is the one we trust.
"""
from fastapi import Request


def client_ip(request: Request) -> str:
    forwarded = [part.strip() for part in request.headers.get("x-forwarded-for", "").split(",") if part.strip()]
    if forwarded:
        return forwarded[-1]
    return request.client.host if request.client else "?"

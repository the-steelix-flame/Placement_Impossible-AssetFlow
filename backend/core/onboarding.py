"""
Pure helpers for onboarding secrets — no business logic. Join codes and signup
tickets are high-entropy random strings; only their SHA-256 hash is stored, and we
look rows up by hash. (These are bearer secrets, not passwords, so a fast hash for
constant-time-ish lookup is appropriate.)
"""
from __future__ import annotations

import hashlib
import hmac
import secrets

_ROLE_PREFIX = {
    "EMPLOYEE": "EMP",
    "DEPT_HEAD": "DH",
    "ASSET_MANAGER": "AM",
}


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.strip().encode()).hexdigest()


def verify_secret(value: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_secret(value), expected_hash)


def new_signup_ticket() -> str:
    return "tkt_" + secrets.token_urlsafe(32)


def new_role_code(role: str) -> str:
    prefix = _ROLE_PREFIX.get(role, "XX")
    return f"AF-{prefix}-{secrets.token_urlsafe(9)}"

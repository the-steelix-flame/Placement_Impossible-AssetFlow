"""
Dev-only: mint a JWT that mimics a Supabase access token, signed with
SUPABASE_JWT_SECRET (HS256). Lets the whole auth flow be exercised locally with
no Supabase project. In production, real tokens come from Supabase — the backend
verification code is identical.

    uv run python manage.py mint_token --email admin@demo.assetflow

Copy the printed token and send it as `Authorization: Bearer <token>`.
"""
from __future__ import annotations

import time
import uuid

import jwt
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Employee
from apps.organization.services import get_default_org


class Command(BaseCommand):
    help = "Mint a Supabase-style HS256 JWT for local auth testing."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Employee email to mint a token for.")
        parser.add_argument("--hours", type=int, default=12, help="Token lifetime in hours.")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        org = get_default_org()
        emp = Employee.objects.filter(org=org, email=email).first()
        if not emp:
            raise CommandError(
                f"No employee with email {email}. Run `seed_demo` first or create one in the admin."
            )
        # Ensure the row is linked to a stable auth_uid so /me resolves consistently.
        if not emp.auth_uid:
            emp.auth_uid = uuid.uuid4()
            emp.save(update_fields=["auth_uid", "updated_at"])

        now = int(time.time())
        payload = {
            "sub": str(emp.auth_uid),
            "email": emp.email,
            "aud": settings.SUPABASE_JWT_AUD,
            "role": "authenticated",
            "iat": now,
            "exp": now + options["hours"] * 3600,
            "user_metadata": {"full_name": emp.full_name},
        }
        token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

        self.stdout.write(self.style.SUCCESS(f"Token for {emp.full_name} <{emp.email}> [{emp.role}]:"))
        self.stdout.write(token)

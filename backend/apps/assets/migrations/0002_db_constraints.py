"""
Applies db/schema.sql — the constraints, triggers, exclusion constraint and
partial unique indexes Django's ORM can't express. Depends on every app's table
creation so all referenced tables exist first.
"""
from pathlib import Path

from django.conf import settings
from django.db import migrations

SCHEMA_SQL = Path(settings.BASE_DIR) / "db" / "schema.sql"


def apply_schema(apps, schema_editor):
    sql = SCHEMA_SQL.read_text(encoding="utf-8")
    # schema.sql keeps single '%' (valid for direct psql). schema_editor.execute
    # runs it through psycopg's client-side mogrify, which treats '%' as a
    # placeholder — double them so they collapse back to a literal '%'.
    schema_editor.execute(sql.replace("%", "%%"))


class Migration(migrations.Migration):

    dependencies = [
        ("assets", "0001_initial"),
        ("accounts", "0002_initial"),
        ("organization", "0001_initial"),
        ("allocation", "0001_initial"),
        ("booking", "0001_initial"),
        ("maintenance", "0001_initial"),
        ("audits", "0001_initial"),
        ("activity", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(apply_schema, migrations.RunPython.noop),
    ]

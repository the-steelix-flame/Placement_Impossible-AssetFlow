"""
Seed a full demo dataset + a staged story for the live demo:
  • Priya Sharma holds a laptop  → shows the double-allocation "held by Priya" 409
  • one overdue allocation        → dashboard overdue section
  • one pending maintenance ticket → approval queue
  • one in-progress audit cycle    → auditor checklist / close flow
  • a confirmed room booking       → calendar + heatmap

Idempotent-ish: refuses to run twice unless --reset wipes the business data first.
Users are created with a stable auth_uid; get a bearer token for any of them with
`manage.py mint_token --email <email>`.
"""
from __future__ import annotations

import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Employee
from apps.allocation import services as alloc_services
from apps.assets import services as asset_services
from apps.audits import services as audit_services
from apps.booking import services as booking_services
from apps.maintenance import services as maint_services
from apps.organization.models import AssetCategory, Department
from apps.organization.services import get_default_org

NS = uuid.NAMESPACE_DNS


def _auth_uid(email: str) -> uuid.UUID:
    return uuid.uuid5(NS, email)


class Command(BaseCommand):
    help = "Seed demo org, departments, categories, ~40 assets, users, and a staged story."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Wipe business data first.")

    @transaction.atomic
    def handle(self, *args, **options):
        org = get_default_org()

        if options["reset"]:
            self._wipe(org)

        if Employee.objects.filter(org=org).exists():
            self.stdout.write(self.style.WARNING(
                "Data already present. Re-run with --reset to reseed."))
            return

        depts = self._departments(org)
        cats = self._categories(org)
        users = self._users(org, depts)
        self._onboarding(org, users["admin"])
        assets = self._assets(org, depts, cats, actor=users["admin"])
        self._story(org, users, assets, depts)

        self.stdout.write(self.style.SUCCESS("\nSeed complete."))
        self.stdout.write("Users (mint a token with: manage.py mint_token --email <email>):")
        for u in users.values():
            self.stdout.write(f"  {u.role:<14} {u.email:<26} {u.full_name}")

    # ── wipe ────────────────────────────────────────────────────────────
    def _wipe(self, org):
        from apps.activity.models import ActivityLog, Notification
        from apps.allocation.models import Allocation, TransferRequest
        from apps.assets.models import Asset, AssetDocument
        from apps.audits.models import AuditAssignment, AuditCycle, AuditItem
        from apps.booking.models import Booking
        from apps.maintenance.models import MaintenanceRequest
        from apps.organization.models import RoleJoinCode, SignupRequest

        SignupRequest.objects.filter(org=org).delete()
        RoleJoinCode.objects.filter(org=org).delete()
        AuditItem.objects.all().delete()
        AuditAssignment.objects.all().delete()
        AuditCycle.objects.all().delete()
        Booking.objects.all().delete()
        MaintenanceRequest.objects.all().delete()
        TransferRequest.objects.all().delete()
        Allocation.objects.all().delete()
        AssetDocument.objects.all().delete()
        Asset.objects.all().delete()
        Notification.objects.all().delete()
        ActivityLog.objects.all().delete()
        AssetCategory.objects.filter(org=org).delete()
        # Clear protected self-FK (parent) and head before deleting employees/depts.
        Department.objects.filter(org=org).update(parent=None, head=None)
        Employee.objects.filter(org=org).delete()
        Department.objects.filter(org=org).delete()
        self.stdout.write(self.style.WARNING("Business data wiped."))

    # ── departments ─────────────────────────────────────────────────────
    def _departments(self, org) -> dict[str, Department]:
        eng = Department.objects.create(org=org, name="Engineering", code="ENG")
        ops = Department.objects.create(org=org, name="Operations", code="OPS")
        hr = Department.objects.create(org=org, name="Human Resources", code="HR")
        fin = Department.objects.create(org=org, name="Finance", code="FIN")
        fac = Department.objects.create(org=org, name="Facilities", code="FAC", parent=ops)
        return {"ENG": eng, "OPS": ops, "HR": hr, "FIN": fin, "FAC": fac}

    # ── categories ──────────────────────────────────────────────────────
    def _categories(self, org) -> dict[str, AssetCategory]:
        electronics = AssetCategory.objects.create(
            org=org, name="Electronics",
            description="Laptops, monitors, phones",
            field_schema=[{"key": "warranty_months", "label": "Warranty (months)", "type": "number"}],
        )
        names = ["Furniture", "Vehicles", "Meeting Rooms", "AV Equipment",
                 "Tools", "Appliances", "Safety Gear"]
        cats = {"Electronics": electronics}
        for n in names:
            cats[n] = AssetCategory.objects.create(org=org, name=n)
        return cats

    # ── users ───────────────────────────────────────────────────────────
    def _users(self, org, depts) -> dict[str, Employee]:
        def emp(email, name, role, dept):
            return Employee.objects.create(
                org=org, email=email, full_name=name, role=role,
                department=dept, auth_uid=_auth_uid(email),
                access_status="ACTIVE",  # seeded users are pre-approved
            )

        users = {
            "admin": emp("admin@demo.assetflow", "Aarav Admin", "ADMIN", depts["ENG"]),
            "manager": emp("manager@demo.assetflow", "Meera Manager", "ASSET_MANAGER", depts["OPS"]),
            "priya": emp("priya@demo.assetflow", "Priya Sharma", "DEPT_HEAD", depts["ENG"]),
            "rohan": emp("rohan@demo.assetflow", "Rohan Rao", "DEPT_HEAD", depts["OPS"]),
            "sana": emp("sana@demo.assetflow", "Sana Iyer", "EMPLOYEE", depts["ENG"]),
            "vikram": emp("vikram@demo.assetflow", "Vikram Nair", "EMPLOYEE", depts["OPS"]),
            "neha": emp("neha@demo.assetflow", "Neha Gupta", "EMPLOYEE", depts["HR"]),
            "karan": emp("karan@demo.assetflow", "Karan Mehta", "EMPLOYEE", depts["FIN"]),
        }
        depts["ENG"].head = users["priya"]
        depts["ENG"].save(update_fields=["head", "updated_at"])
        depts["OPS"].head = users["rohan"]
        depts["OPS"].save(update_fields=["head", "updated_at"])
        return users

    # ── onboarding: role codes + a pending join request ─────────────────
    def _onboarding(self, org, admin):
        from apps.organization import services as org_services

        codes = org_services._mint_role_codes(org, admin)
        role_codes = {c["role"]: c["code"] for c in codes}
        # A pending join request so the Admin approval queue isn't empty in the demo.
        org_services.validate_join_code(
            full_name="Ishaan Pending", email="pending@demo.assetflow",
            requested_role="EMPLOYEE", role_code=role_codes["EMPLOYEE"],
        )
        self.stdout.write(self.style.SUCCESS("Role join codes (demo — copy for Join Company):"))
        for role, code in role_codes.items():
            self.stdout.write(f"  {role:<14} {code}")
        self.stdout.write("Pending join request: pending@demo.assetflow (EMPLOYEE) — approve in the queue")

    # ── assets ──────────────────────────────────────────────────────────
    def _assets(self, org, depts, cats, actor) -> dict[str, object]:
        made: dict[str, object] = {}

        def mk(name, cat, dept, *, condition="GOOD", is_bookable=False, serial=None, cost=None):
            a = asset_services.create_asset(
                actor=actor, org=org,
                data={
                    "name": name, "category_id": cats[cat].id,
                    "department_id": depts[dept].id, "condition": condition,
                    "is_bookable": is_bookable, "serial_number": serial,
                    "acquisition_cost": cost, "custom_fields": {},
                    "acquisition_date": str((timezone.now() - timedelta(days=400)).date()),
                },
            )
            made[name] = a
            return a

        # Electronics (laptops/monitors/phones)
        for i in range(1, 11):
            mk(f"Dell Latitude Laptop #{i}", "Electronics", "ENG",
               serial=f"DL-{1000+i}", cost="85000.00")
        for i in range(1, 6):
            mk(f"LG 27\" Monitor #{i}", "Electronics", "OPS", serial=f"LG-{200+i}")
        for i in range(1, 5):
            mk(f"iPhone 14 #{i}", "Electronics", "OPS", serial=f"IP-{300+i}", cost="70000.00")

        # Furniture
        for i in range(1, 6):
            mk(f"Ergonomic Chair #{i}", "Furniture", "FAC")

        # Vehicles (2 bookable)
        mk("Toyota Innova (Fleet A)", "Vehicles", "OPS", is_bookable=True, serial="VH-A1", cost="1800000.00")
        mk("Maruti Ertiga (Fleet B)", "Vehicles", "OPS", is_bookable=True, serial="VH-B2", cost="1200000.00")

        # Meeting Rooms (3 bookable)
        mk("Conference Room Alpha", "Meeting Rooms", "FAC", is_bookable=True)
        mk("Conference Room Beta", "Meeting Rooms", "FAC", is_bookable=True)
        mk("Huddle Room Gamma", "Meeting Rooms", "FAC", is_bookable=True)

        # AV Equipment (1 bookable projector)
        mk("Epson Projector", "AV Equipment", "FAC", is_bookable=True, serial="AV-1")
        mk("Logitech Conf Cam", "AV Equipment", "FAC", serial="AV-2")

        # Tools / Appliances / Safety
        for i in range(1, 4):
            mk(f"Cordless Drill #{i}", "Tools", "FAC")
        mk("Microwave Oven", "Appliances", "HR")
        mk("Water Dispenser", "Appliances", "HR")
        for i in range(1, 4):
            mk(f"Safety Helmet #{i}", "Safety Gear", "FAC", condition="NEW")

        return made

    # ── staged story ────────────────────────────────────────────────────
    def _story(self, org, users, assets, depts):
        admin = users["admin"]

        # 1) Priya holds a laptop → double-allocation demo
        priya_laptop = assets["Dell Latitude Laptop #1"]
        alloc_services.allocate(actor=admin, org=org, data={
            "asset_id": priya_laptop.id, "employee_id": users["priya"].id,
            "expected_return_date": str((timezone.now() + timedelta(days=30)).date()),
        })

        # 2) Overdue allocation
        overdue_laptop = assets["Dell Latitude Laptop #2"]
        alloc_services.allocate(actor=admin, org=org, data={
            "asset_id": overdue_laptop.id, "employee_id": users["sana"].id,
            "expected_return_date": str((timezone.now() - timedelta(days=5)).date()),
        })

        # 3) Pending maintenance ticket
        maint_services.raise_request(actor=users["vikram"], org=org, data={
            "asset_id": assets["LG 27\" Monitor #1"].id,
            "title": "Flickering display", "priority": "HIGH",
            "description": "Screen flickers intermittently under load.",
        })

        # 4) In-progress audit cycle over Engineering
        cycle = audit_services.create_cycle(actor=admin, org=org, data={
            "name": "Q3 Engineering Audit",
            "scope_department_id": depts["ENG"].id,
            "starts_on": str(timezone.now().date()),
            "ends_on": str((timezone.now() + timedelta(days=14)).date()),
            "auditor_ids": [users["priya"].id],
        })
        audit_services.start_cycle(actor=admin, cycle=cycle)

        # 5) A confirmed room booking (calendar + heatmap)
        start = (timezone.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
        booking_services.create_booking(actor=users["manager"], org=org, data={
            "asset_id": assets["Conference Room Alpha"].id,
            "starts_at": start, "ends_at": start + timedelta(hours=1),
            "purpose": "Sprint planning",
        })

        self.stdout.write(self.style.SUCCESS(
            f"Staged: Priya holds {priya_laptop.asset_tag}; "
            f"{overdue_laptop.asset_tag} overdue; 1 pending maintenance; 1 audit in progress."))

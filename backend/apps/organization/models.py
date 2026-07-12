import uuid

from django.db import models

from core.enums import JoinCodeRole, RecordStatus


class Organization(models.Model):
    """Tenancy root. Each Create-Company signup makes a new one."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    slug = models.TextField(unique=True, null=True, blank=True)  # public workspace handle
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organizations"

    def __str__(self):
        return self.name


class RoleJoinCode(models.Model):
    """
    One active high-entropy code per (org, role). The plaintext is shown only right
    after creation/rotation; only a hash is stored. Admin can rotate/revoke.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="role_join_codes")
    role = models.CharField(max_length=16, choices=JoinCodeRole.choices)
    code_hash = models.TextField(unique=True)
    # Plaintext kept so Admins can view/copy/share the invite (codes are invitations,
    # not passwords; joining still requires Admin approval).
    code = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_rotated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "role_join_codes"
        indexes = [
            models.Index(fields=["role", "status"], name="idx_role_join_codes_lookup"),
        ]

    def __str__(self):
        return f"{self.org_id} {self.role} ({self.status})"


class SignupRequest(models.Model):
    """
    Created before Supabase sends an email. Carries a single-use signup ticket
    (hashed) that the frontend puts in Supabase user_metadata; the auth bridge
    links auth_uid on first verified login.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="signup_requests")
    role_code = models.ForeignKey(
        RoleJoinCode, null=True, blank=True, on_delete=models.SET_NULL
    )
    employee = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="signup_requests",
    )
    signup_ticket_hash = models.TextField(unique=True)
    full_name = models.TextField()
    email = models.CharField(max_length=320)
    requested_role = models.CharField(max_length=16)  # user_role value
    status = models.CharField(max_length=32, default="PENDING_EMAIL_VERIFICATION")
    decided_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="signup_decisions",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "signup_requests"
        indexes = [
            models.Index(fields=["org", "status", "-created_at"], name="idx_signup_req_org_status"),
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="departments")
    name = models.TextField()
    code = models.TextField()  # short code e.g. "ENG"
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    head = models.ForeignKey(
        "accounts.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="heads_departments",
    )
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "departments"
        constraints = [
            models.UniqueConstraint(fields=["org", "name"], name="dept_name_unique"),
            models.UniqueConstraint(fields=["org", "code"], name="dept_code_unique"),
        ]

    def __str__(self):
        return f"{self.code} — {self.name}"


class AssetCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="categories")
    name = models.TextField()
    description = models.TextField(null=True, blank=True)
    # e.g. [{"key":"warranty_months","label":"Warranty (months)","type":"number"}]
    field_schema = models.JSONField(default=list)
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asset_categories"
        verbose_name_plural = "asset categories"
        constraints = [
            models.UniqueConstraint(fields=["org", "name"], name="cat_name_unique"),
        ]

    def __str__(self):
        return self.name

import uuid

from django.db import models

from core.enums import EmployeeAccessStatus, RecordStatus, UserRole


class Employee(models.Model):
    """
    Bridge to Supabase Auth. ROLES LIVE HERE, never in the JWT. `auth_uid` is NULL
    until the person's first login links their Supabase user to this row.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        "organization.Organization", on_delete=models.PROTECT, related_name="employees"
    )
    auth_uid = models.UUIDField(unique=True, null=True, blank=True)
    full_name = models.TextField()
    email = models.CharField(max_length=320)  # citext in DB; lowercased on save
    department = models.ForeignKey(
        "organization.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
    )
    role = models.CharField(max_length=16, choices=UserRole.choices, default=UserRole.EMPLOYEE)
    # Role requested via a join code (before Admin approval grants `role`).
    requested_role = models.CharField(
        max_length=16, choices=UserRole.choices, null=True, blank=True
    )
    # Gates access to company data. Pending users authenticate but see nothing.
    access_status = models.CharField(
        max_length=20,
        choices=EmployeeAccessStatus.choices,
        default=EmployeeAccessStatus.PENDING_APPROVAL,
    )
    status = models.CharField(
        max_length=16, choices=RecordStatus.choices, default=RecordStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employees"
        constraints = [
            models.UniqueConstraint(fields=["org", "email"], name="emp_email_unique"),
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} <{self.email}> ({self.role})"

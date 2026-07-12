import uuid

from django.db import models

from core.enums import AssetCondition, TransferStatus


class Allocation(models.Model):
    """
    Who holds what. The partial unique index `uniq_open_allocation`
    (in db/schema.sql) guarantees at most one open allocation per asset —
    the double-allocation rule, unbreakable even by raw SQL.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    asset = models.ForeignKey("assets.Asset", on_delete=models.PROTECT, related_name="allocations")
    employee = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="allocations",
    )
    department = models.ForeignKey(
        "organization.Department", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="allocations",
    )
    allocated_by = models.ForeignKey(
        "accounts.Employee", on_delete=models.PROTECT, related_name="allocations_made"
    )
    allocated_at = models.DateTimeField(auto_now_add=True)
    expected_return_date = models.DateField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    return_condition = models.CharField(
        max_length=16, choices=AssetCondition.choices, null=True, blank=True
    )
    return_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "allocations"

    def __str__(self):
        return f"Allocation of {self.asset_id} ({'open' if self.returned_at is None else 'closed'})"


class TransferRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey("organization.Organization", on_delete=models.PROTECT)
    asset = models.ForeignKey("assets.Asset", on_delete=models.PROTECT, related_name="transfer_requests")
    from_allocation = models.ForeignKey(
        Allocation, on_delete=models.PROTECT, related_name="transfer_requests"
    )
    requested_by = models.ForeignKey(
        "accounts.Employee", on_delete=models.PROTECT, related_name="transfers_requested"
    )
    to_employee = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="transfers_incoming",
    )
    to_department = models.ForeignKey(
        "organization.Department", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="transfers_incoming",
    )
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=TransferStatus.choices, default=TransferStatus.REQUESTED
    )
    decided_by = models.ForeignKey(
        "accounts.Employee", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="transfers_decided",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transfer_requests"

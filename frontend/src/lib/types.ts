// ============================================================
// AssetFlow — Shared TypeScript types
// Mirrors docs/DATABASE_SCHEMA.md enums and entity shapes.
// Dev B owns this file — placeholder stubs until SYNC 1 merge.
// ============================================================

// -- Enums --

export type UserRole = "ADMIN" | "ASSET_MANAGER" | "DEPT_HEAD" | "EMPLOYEE";

export type RecordStatus = "ACTIVE" | "INACTIVE";

export type AssetStatus =
  | "AVAILABLE"
  | "ALLOCATED"
  | "RESERVED"
  | "UNDER_MAINTENANCE"
  | "LOST"
  | "RETIRED"
  | "DISPOSED";

export type AssetCondition = "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";

export type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export type MaintenanceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CANCELLED";

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AuditCycleStatus = "DRAFT" | "IN_PROGRESS" | "CLOSED";

export type AuditResult = "PENDING" | "VERIFIED" | "MISSING" | "DAMAGED";

export type NotificationType =
  | "ASSET_ASSIGNED"
  | "ASSET_RETURNED"
  | "TRANSFER_REQUESTED"
  | "TRANSFER_APPROVED"
  | "TRANSFER_REJECTED"
  | "MAINT_APPROVED"
  | "MAINT_REJECTED"
  | "MAINT_RESOLVED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "OVERDUE_RETURN"
  | "AUDIT_ASSIGNED"
  | "AUDIT_DISCREPANCY"
  | "ROLE_CHANGED";

// -- Entities --

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  role: UserRole;
  status: RecordStatus;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  head_id: string | null;
  status: RecordStatus;
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  field_schema: Record<string, unknown>[];
  status: RecordStatus;
}

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  category_id: string;
  category_name?: string;
  serial_number: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  condition: AssetCondition;
  status: AssetStatus;
  location: string | null;
  department_id: string | null;
  department_name?: string;
  is_bookable: boolean;
  photo_url: string | null;
  created_at: string;
}

export interface Allocation {
  id: string;
  asset_id: string;
  asset?: Asset;
  employee_id: string | null;
  employee?: Employee;
  department_id: string | null;
  department?: Department;
  allocated_by: string;
  allocated_at: string;
  expected_return_date: string | null;
  returned_at: string | null;
  return_condition: AssetCondition | null;
  return_notes: string | null;
}

export interface TransferRequest {
  id: string;
  asset_id: string;
  asset?: Asset;
  from_allocation_id: string;
  requested_by: string;
  requester?: Employee;
  to_employee_id: string | null;
  to_employee?: Employee;
  to_department_id: string | null;
  to_department?: Department;
  reason: string | null;
  status: TransferStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  asset_id: string;
  asset?: Asset;
  booked_by: string;
  booker?: Employee;
  starts_at: string;
  ends_at: string;
  purpose: string | null;
  status: BookingStatus;
  cancelled_at: string | null;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  asset_id: string;
  asset?: Asset;
  raised_by: string;
  raiser?: Employee;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  photo_url: string | null;
  status: MaintenanceStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  technician_name: string | null;
  assigned_at: string | null;
  started_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface AuditCycle {
  id: string;
  name: string;
  scope_department_id: string | null;
  scope_department?: Department;
  scope_location: string | null;
  starts_on: string;
  ends_on: string;
  status: AuditCycleStatus;
  created_by: string;
  creator?: Employee;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface AuditItem {
  id: string;
  cycle_id: string;
  asset_id: string;
  asset?: Asset;
  result: AuditResult;
  notes: string | null;
  checked_by: string | null;
  checker?: Employee;
  checked_at: string | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  actor?: Employee;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// -- API response shapes --

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ConflictError {
  detail: string;
  holder?: string;
  holder_id?: string;
  suggestion?: "TRANSFER";
  next_available_slot?: {
    starts_at: string;
    ends_at: string;
  };
}

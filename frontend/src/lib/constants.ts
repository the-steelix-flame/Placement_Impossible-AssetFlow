// ============================================================
// Status → display config maps
// Dev B owns this file — placeholder until SYNC 1 merge.
// ============================================================

import type {
  AssetStatus,
  AssetCondition,
  TransferStatus,
  BookingStatus,
  MaintenanceStatus,
  MaintenancePriority,
  AuditCycleStatus,
  AuditResult,
} from "./types";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

export const ROLE_LABELS: Record<import("./types").UserRole, string> = {
  ADMIN: "Admin",
  ASSET_MANAGER: "Asset Manager",
  DEPT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
};

export const ASSET_STATUS: Record<AssetStatus, StatusConfig> = {
  AVAILABLE:         { label: "Available",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  ALLOCATED:         { label: "Allocated",         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  RESERVED:          { label: "Reserved",          color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  UNDER_MAINTENANCE: { label: "Under Maintenance", color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
  LOST:              { label: "Lost",              color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  RETIRED:           { label: "Retired",           color: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
  DISPOSED:          { label: "Disposed",          color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
};

export const ASSET_CONDITION: Record<AssetCondition, StatusConfig> = {
  NEW:     { label: "New",     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  GOOD:    { label: "Good",    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  FAIR:    { label: "Fair",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  POOR:    { label: "Poor",    color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
  DAMAGED: { label: "Damaged", color: "text-red-700",     bg: "bg-red-50 border-red-200" },
};

export const TRANSFER_STATUS: Record<TransferStatus, StatusConfig> = {
  REQUESTED: { label: "Requested", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  APPROVED:  { label: "Approved",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  REJECTED:  { label: "Rejected",  color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  CANCELLED: { label: "Cancelled", color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
  COMPLETED: { label: "Completed", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
};

export const BOOKING_STATUS: Record<BookingStatus, StatusConfig> = {
  CONFIRMED: { label: "Confirmed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  CANCELLED: { label: "Cancelled", color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
};

export const MAINTENANCE_STATUS: Record<MaintenanceStatus, StatusConfig> = {
  PENDING:     { label: "Pending",     color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  APPROVED:    { label: "Approved",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  REJECTED:    { label: "Rejected",    color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  ASSIGNED:    { label: "Assigned",    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  IN_PROGRESS: { label: "In Progress", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  RESOLVED:    { label: "Resolved",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  CANCELLED:   { label: "Cancelled",   color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
};

export const MAINTENANCE_PRIORITY: Record<MaintenancePriority, StatusConfig> = {
  LOW:      { label: "Low",      color: "text-slate-700",  bg: "bg-slate-50 border-slate-200" },
  MEDIUM:   { label: "Medium",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  HIGH:     { label: "High",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  CRITICAL: { label: "Critical", color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

export const AUDIT_CYCLE_STATUS: Record<AuditCycleStatus, StatusConfig> = {
  DRAFT:       { label: "Draft",       color: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  CLOSED:      { label: "Closed",      color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

export const AUDIT_RESULT: Record<AuditResult, StatusConfig> = {
  PENDING:  { label: "Pending",  color: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
  VERIFIED: { label: "Verified", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  MISSING:  { label: "Missing",  color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  DAMAGED:  { label: "Damaged",  color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
};

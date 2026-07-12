import type {
  Asset,
  AssetCategory,
  DashboardKpis,
  Department,
  Employee,
  OverdueAllocation,
  PassportEvent,
} from "@/lib/types";

export const mockDepartments: Department[] = [
  { id: "dept-eng", name: "Engineering", code: "ENG", parent_id: null, head_id: "emp-aarav", status: "ACTIVE" },
  { id: "dept-ops", name: "Operations", code: "OPS", parent_id: null, head_id: "emp-priya", status: "ACTIVE" },
  { id: "dept-fac", name: "Facilities", code: "FAC", parent_id: "dept-ops", head_id: "emp-rohan", status: "ACTIVE" },
  { id: "dept-fin", name: "Finance", code: "FIN", parent_id: null, head_id: null, status: "ACTIVE" },
];

export const mockCategories: AssetCategory[] = [
  {
    id: "cat-electronics",
    name: "Electronics",
    description: "Laptops, monitors, phones, and accessories",
    field_schema: [{ key: "warranty_months", label: "Warranty months", type: "number" }],
    status: "ACTIVE",
  },
  {
    id: "cat-meeting",
    name: "Meeting Rooms",
    description: "Bookable rooms and collaboration spaces",
    field_schema: [{ key: "capacity", label: "Capacity", type: "number" }],
    status: "ACTIVE",
  },
  {
    id: "cat-av",
    name: "AV Equipment",
    description: "Projectors, cameras, microphones, and speaker kits",
    field_schema: [{ key: "kit_type", label: "Kit type", type: "text" }],
    status: "ACTIVE",
  },
];

export const mockEmployees: Employee[] = [
  {
    id: "emp-admin",
    full_name: "Akash Admin",
    email: "admin@demo.assetflow",
    department_id: "dept-eng",
    department_name: "Engineering",
    role: "ADMIN",
    status: "ACTIVE",
  },
  {
    id: "emp-priya",
    full_name: "Priya Sharma",
    email: "priya@demo.assetflow",
    department_id: "dept-ops",
    department_name: "Operations",
    role: "DEPT_HEAD",
    status: "ACTIVE",
  },
  {
    id: "emp-aarav",
    full_name: "Aarav Mehta",
    email: "manager@demo.assetflow",
    department_id: "dept-eng",
    department_name: "Engineering",
    role: "ASSET_MANAGER",
    status: "ACTIVE",
  },
];

export const mockAssets: Asset[] = [
  {
    id: "asset-0114",
    asset_tag: "AF-0114",
    name: "Lenovo ThinkPad X1 Carbon",
    category_id: "cat-electronics",
    category_name: "Electronics",
    serial_number: "LNV-X1-9R42",
    acquisition_date: "2025-05-12",
    acquisition_cost: 142500,
    condition: "GOOD",
    status: "ALLOCATED",
    location: "Bengaluru HQ - 3F",
    department_id: "dept-eng",
    department_name: "Engineering",
    is_bookable: false,
    photo_url: null,
    created_at: "2026-06-20T08:30:00Z",
    updated_at: "2026-07-10T10:30:00Z",
  },
  {
    id: "asset-0032",
    asset_tag: "AF-0032",
    name: "Boardroom A",
    category_id: "cat-meeting",
    category_name: "Meeting Rooms",
    serial_number: null,
    acquisition_date: "2024-03-08",
    acquisition_cost: null,
    condition: "GOOD",
    status: "AVAILABLE",
    location: "Bengaluru HQ - 6F",
    department_id: "dept-fac",
    department_name: "Facilities",
    is_bookable: true,
    photo_url: null,
    created_at: "2026-05-16T09:15:00Z",
    updated_at: "2026-07-08T11:10:00Z",
  },
  {
    id: "asset-0068",
    asset_tag: "AF-0068",
    name: "Epson Laser Projector",
    category_id: "cat-av",
    category_name: "AV Equipment",
    serial_number: "EPS-LP-4481",
    acquisition_date: "2025-11-02",
    acquisition_cost: 78000,
    condition: "FAIR",
    status: "UNDER_MAINTENANCE",
    location: "AV Store",
    department_id: "dept-fac",
    department_name: "Facilities",
    is_bookable: true,
    photo_url: null,
    created_at: "2026-05-22T08:20:00Z",
    updated_at: "2026-07-11T15:25:00Z",
  },
];

export const mockKpis: DashboardKpis = {
  total_assets: 412,
  assets_by_status: { AVAILABLE: 248, ALLOCATED: 126, UNDER_MAINTENANCE: 7 },
  available: 248,
  allocated: 126,
  under_maintenance: 7,
  active_allocations: 126,
  overdue_returns: 9,
  open_maintenance: 7,
  pending_maintenance: 3,
  upcoming_bookings: 18,
};

export const mockOverdue: OverdueAllocation[] = [
  {
    allocation_id: "alloc-1",
    asset_id: "asset-0114",
    asset_tag: "AF-0114",
    asset_name: "Lenovo ThinkPad X1 Carbon",
    holder: "Priya Sharma",
    expected_return_date: "2026-07-09",
    days_overdue: 3,
  },
];

export const mockPassportEvents: PassportEvent[] = [
  {
    at: "2026-07-10T10:30:00Z",
    kind: "ALLOCATED",
    title: "Allocated to Priya Sharma",
    detail: "Expected return is 22 Jul 2026.",
  },
  {
    at: "2026-06-24T15:00:00Z",
    kind: "STATUS_CHANGED",
    title: "Location updated",
    detail: "Moved to Bengaluru HQ - 3F.",
  },
  {
    at: "2026-06-20T08:30:00Z",
    kind: "REGISTERED",
    title: "Asset registered",
    detail: "Created under Electronics with condition Good.",
  },
];

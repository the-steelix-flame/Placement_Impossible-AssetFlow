import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AUDIT_RESULT } from "@/lib/constants";
import type { AuditItem } from "@/lib/types";
import { useAuditDiscrepancies } from "./useAudits";

const columns: DataTableColumn<AuditItem>[] = [
  { header: "Asset Tag", accessorKey: "asset_id", cell: (row) => row.asset?.asset_tag ?? row.asset_id },
  { header: "Asset Name", accessorKey: "asset_name", cell: (row) => row.asset?.name ?? "-" },
  {
    header: "Result",
    accessorKey: "result",
    cell: (row) => <StatusBadge config={AUDIT_RESULT[row.result]} />,
  },
  { header: "Notes", accessorKey: "notes", cell: (row) => row.notes ?? "-" },
  {
    header: "Checked By",
    accessorKey: "checker",
    cell: (row) => row.checker?.full_name ?? "-",
  },
];

export function DiscrepancyReport({ cycleId }: { cycleId: string }) {
  const { data = [], isLoading, isError } = useAuditDiscrepancies(cycleId);

  if (isLoading) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading discrepancies...</div>;
  if (isError) return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load discrepancies.</div>;
  if (!data.length) return <EmptyState title="No discrepancies" description="Every checked asset in this cycle was verified." />;

  return <DataTable columns={columns} data={data} />;
}

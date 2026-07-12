"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { ActivityLog } from "@/lib/types";

const columns: DataTableColumn<ActivityLog>[] = [
  {
    header: "Timestamp",
    accessorKey: "created_at",
    cell: (row) => new Date(row.created_at).toLocaleString(),
  },
  {
    header: "Actor",
    accessorKey: "actor_name",
    cell: (row) => row.actor_name ?? row.actor?.full_name ?? "System",
  },
  { header: "Action", accessorKey: "action" },
  { header: "Entity", accessorKey: "entity_type" },
];

export default function ActivityPage() {
  const { data = [], isLoading, isError } = useApiQuery<ActivityLog[]>(["activity-logs"], "/activity-logs");

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Activity Log"
        description="Complete system activity and audit trail."
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading activity...</div>
        ) : isError ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load the activity log.</div>
        ) : !data.length ? (
          <EmptyState title="No activity yet" description="Every mutation across the system shows up here." />
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>
    </div>
  );
}

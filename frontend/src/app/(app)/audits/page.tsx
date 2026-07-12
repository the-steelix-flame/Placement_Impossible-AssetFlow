"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AUDIT_CYCLE_STATUS } from "@/lib/constants";
import type { AuditCycle } from "@/lib/types";
import { useAuditCycles } from "./_components/useAudits";
import { CycleWizard } from "./_components/CycleWizard";

const columns: DataTableColumn<AuditCycle>[] = [
  { header: "Cycle Name", accessorKey: "name" },
  { header: "Scope", accessorKey: "scope_department", cell: (row) => row.scope_department?.name ?? row.scope_location ?? "Organization-wide" },
  { header: "Start Date", accessorKey: "starts_on" },
  { header: "End Date", accessorKey: "ends_on" },
  {
    header: "Status",
    accessorKey: "status",
    cell: (row) => <StatusBadge config={AUDIT_CYCLE_STATUS[row.status]} />,
  },
  {
    header: "Actions",
    accessorKey: "actions",
    cell: (row) => (
      <Link href={`/audits/${row.id}`}>
        <Button variant="outline" size="sm">
          {row.status === "DRAFT" ? "Start Audit" : row.status === "CLOSED" ? "View Report" : "Resume Audit"}
        </Button>
      </Link>
    ),
  },
];

export default function AuditsPage() {
  const { data = [], isLoading, isError } = useAuditCycles();

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Audits"
        description="Conduct physical verification of assets against registry records."
      >
        <CycleWizard>
          <Button>New Audit Cycle</Button>
        </CycleWizard>
      </PageHeader>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Active & Recent Audit Cycles</h3>
        {isLoading ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading audit cycles...</div>
        ) : isError ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load audit cycles.</div>
        ) : !data.length ? (
          <EmptyState title="No audit cycles yet" description="Create a new audit cycle to start verifying assets." />
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>
    </div>
  );
}

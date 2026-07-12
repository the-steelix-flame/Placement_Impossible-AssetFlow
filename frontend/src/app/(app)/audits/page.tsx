import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AUDIT_CYCLE_STATUS } from "@/lib/constants";

export default function AuditsPage() {
  const mockCycles = [
    {
      id: "1",
      name: "Q3 Engineering Asset Audit",
      scope: "Engineering Dept",
      starts_on: "2026-07-01",
      ends_on: "2026-07-15",
      status: "IN_PROGRESS",
    }
  ];

  const columns = [
    { header: "Cycle Name", accessorKey: "name" },
    { header: "Scope", accessorKey: "scope" },
    { header: "Start Date", accessorKey: "starts_on" },
    { header: "End Date", accessorKey: "ends_on" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: any) => <StatusBadge config={AUDIT_CYCLE_STATUS[row.status as keyof typeof AUDIT_CYCLE_STATUS]} />
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: () => <Button variant="outline" size="sm">Resume Audit</Button>
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Audits" 
        description="Conduct physical verification of assets against registry records."
      >
        <Button>New Audit Cycle</Button>
      </PageHeader>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Active & Recent Audit Cycles</h3>
        <DataTable columns={columns} data={mockCycles} />
      </div>
    </div>
  );
}

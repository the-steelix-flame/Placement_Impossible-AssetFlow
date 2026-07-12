import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";

export default function ActivityPage() {
  const mockActivity = [
    {
      id: "1",
      created_at: "2026-07-12T09:00:00Z",
      actor: "Priya Sharma",
      action: "Asset Allocated",
      details: "MacBook Pro M3 (AF-0114) was allocated to Priya Sharma"
    },
    {
      id: "2",
      created_at: "2026-07-12T08:30:00Z",
      actor: "System",
      action: "Status Updated",
      details: "Conference Room A status changed to RESERVED"
    }
  ];

  const columns = [
    { header: "Timestamp", accessorKey: "created_at" },
    { header: "Actor", accessorKey: "actor" },
    { header: "Action", accessorKey: "action" },
    { header: "Details", accessorKey: "details" },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Activity Log" 
        description="Complete system activity and audit trail."
      />

      <div className="mt-6">
        <DataTable columns={columns} data={mockActivity} />
      </div>
    </div>
  );
}

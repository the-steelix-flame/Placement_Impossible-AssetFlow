import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MAINTENANCE_STATUS, MAINTENANCE_PRIORITY } from "@/lib/constants";

type MaintenanceRow = {
  id: string;
  asset_name: string;
  title: string;
  priority: keyof typeof MAINTENANCE_PRIORITY;
  status: keyof typeof MAINTENANCE_STATUS;
  raised_by: string;
  created_at: string;
};

export default function MaintenancePage() {
  const mockRequests: MaintenanceRow[] = [
    {
      id: "1",
      asset_name: "Coffee Machine",
      title: "Not heating up",
      priority: "HIGH",
      status: "PENDING",
      raised_by: "Alice Smith",
      created_at: "2026-07-10T10:00:00Z"
    }
  ];

  const columns = [
    { header: "Asset", accessorKey: "asset_name" },
    { header: "Issue", accessorKey: "title" },
    { 
      header: "Priority", 
      accessorKey: "priority",
      cell: (row: MaintenanceRow) => <StatusBadge config={MAINTENANCE_PRIORITY[row.priority]} />
    },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: MaintenanceRow) => <StatusBadge config={MAINTENANCE_STATUS[row.status]} />
    },
    { header: "Raised By", accessorKey: "raised_by" },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: () => <Button variant="outline" size="sm">View</Button>
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Maintenance" 
        description="Raise and track maintenance requests for assets."
      >
        <Button>Raise Request</Button>
      </PageHeader>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="approval-queue">Approval Queue</TabsTrigger>
          <TabsTrigger value="active">Active Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="my-requests">
          <DataTable columns={columns} data={mockRequests} />
        </TabsContent>
        <TabsContent value="approval-queue">
          <DataTable columns={columns} data={mockRequests} />
        </TabsContent>
        <TabsContent value="active">
          <DataTable columns={columns} data={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

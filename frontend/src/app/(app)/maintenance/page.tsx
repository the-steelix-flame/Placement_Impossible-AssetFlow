import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MAINTENANCE_STATUS, MAINTENANCE_PRIORITY } from "@/lib/constants";

export default function MaintenancePage() {
  const mockRequests = [
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
      cell: (row: any) => <StatusBadge config={MAINTENANCE_PRIORITY[row.priority as keyof typeof MAINTENANCE_PRIORITY]} />
    },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: any) => <StatusBadge config={MAINTENANCE_STATUS[row.status as keyof typeof MAINTENANCE_STATUS]} />
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

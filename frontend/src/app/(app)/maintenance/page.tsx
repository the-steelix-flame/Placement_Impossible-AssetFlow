"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { MAINTENANCE_STATUS, MAINTENANCE_PRIORITY } from "@/lib/constants";
import type { MaintenanceRequest } from "@/lib/types";
import { useMaintenanceRequests } from "./_components/useMaintenance";
import { RaiseRequestDialog } from "./_components/RaiseRequestDialog";
import { ApprovalCard } from "./_components/ApprovalCard";
import { ActiveMaintenanceCard } from "./_components/ActiveMaintenanceCard";

const ACTIVE_STATUSES = ["APPROVED", "ASSIGNED", "IN_PROGRESS"];

const columns: DataTableColumn<MaintenanceRequest>[] = [
  { header: "Asset", accessorKey: "asset_id", cell: (row) => row.asset?.name ?? row.asset_id },
  { header: "Issue", accessorKey: "title" },
  {
    header: "Priority",
    accessorKey: "priority",
    cell: (row) => <StatusBadge config={MAINTENANCE_PRIORITY[row.priority]} />,
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: (row) => <StatusBadge config={MAINTENANCE_STATUS[row.status]} />,
  },
  {
    header: "Raised",
    accessorKey: "created_at",
    cell: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

function MyRequestsTable() {
  const { data = [], isLoading, isError } = useMaintenanceRequests({ mine: true });

  if (isLoading) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading requests...</div>;
  if (isError) return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load requests.</div>;
  if (!data.length) return <EmptyState title="No maintenance requests" description="Requests you raise will show up here." />;

  return <DataTable columns={columns} data={data} />;
}

function ApprovalQueue() {
  const { data = [], isLoading, isError } = useMaintenanceRequests({ status: "PENDING" });

  if (isLoading) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading approval queue...</div>;
  if (isError) return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load approval queue.</div>;
  if (!data.length) return <EmptyState title="Nothing pending" description="No maintenance requests are waiting for approval." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((request) => (
        <ApprovalCard key={request.id} request={request} />
      ))}
    </div>
  );
}

function ActiveMaintenanceList() {
  const { data = [], isLoading, isError } = useMaintenanceRequests();
  const active = data.filter((r) => ACTIVE_STATUSES.includes(r.status));

  if (isLoading) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading active maintenance...</div>;
  if (isError) return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load active maintenance.</div>;
  if (!active.length) return <EmptyState title="No active maintenance" description="Approved requests move here through assignment and resolution." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {active.map((request) => (
        <ActiveMaintenanceCard key={request.id} request={request} />
      ))}
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Maintenance"
        description="Raise and track maintenance requests for assets."
      >
        <RaiseRequestDialog>
          <Button>Raise Request</Button>
        </RaiseRequestDialog>
      </PageHeader>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="approval-queue">Approval Queue</TabsTrigger>
          <TabsTrigger value="active">Active Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="my-requests">
          <MyRequestsTable />
        </TabsContent>
        <TabsContent value="approval-queue">
          <ApprovalQueue />
        </TabsContent>
        <TabsContent value="active">
          <ActiveMaintenanceList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

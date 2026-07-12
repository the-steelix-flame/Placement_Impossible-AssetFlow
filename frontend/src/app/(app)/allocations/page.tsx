"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS } from "@/lib/constants";
import type { Allocation } from "@/lib/types";
import { useAllocations } from "./_components/useAllocations";
import { AllocateDialog } from "./_components/AllocateDialog";
import { ReturnDialog } from "./_components/ReturnDialog";
import { TransferQueue } from "./_components/TransferQueue";

const columns = [
  { header: "Asset Tag", accessorKey: "asset_tag", cell: (row: Allocation) => row.asset_tag ?? row.asset?.asset_tag ?? "-" },
  { header: "Asset Name", accessorKey: "asset_name", cell: (row: Allocation) => row.asset_name ?? row.asset?.name ?? "-" },
  {
    header: "Current Holder",
    accessorKey: "employee_name",
    cell: (row: Allocation) => row.employee_name ?? row.employee?.full_name ?? row.department_name ?? row.department?.name ?? "-",
  },
  { header: "Expected Return", accessorKey: "expected_return_date", cell: (row: Allocation) => row.expected_return_date ?? "-" },
  {
    header: "Status",
    accessorKey: "status",
    cell: (row: Allocation) => (
      <StatusBadge config={row.returned_at ? ASSET_STATUS.AVAILABLE : ASSET_STATUS.ALLOCATED} />
    ),
  },
  {
    header: "Actions",
    accessorKey: "actions",
    cell: (row: Allocation) =>
      row.returned_at ? (
        <span className="text-sm text-muted-foreground">Returned</span>
      ) : (
        <ReturnDialog allocationId={row.id}>
          <Button variant="outline" size="sm">Return</Button>
        </ReturnDialog>
      ),
  },
];

function AllocationTable({ state }: { state?: "active" | "overdue" | "returned" }) {
  const { data = [], isLoading, isError } = useAllocations(state);

  if (isLoading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading allocations...</div>;
  }

  if (isError) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load allocations.</div>;
  }

  return <DataTable columns={columns} data={data} />;
}

export default function AllocationsPage() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Allocations & Transfers"
        description="Manage asset assignments and handle transfer requests."
      >
        <AllocateDialog>
          <Button>Allocate Asset</Button>
        </AllocateDialog>
      </PageHeader>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active Allocations</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="returned">Recently Returned</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <AllocationTable state="active" />
        </TabsContent>
        <TabsContent value="overdue">
          <AllocationTable state="overdue" />
        </TabsContent>
        <TabsContent value="returned">
          <AllocationTable state="returned" />
        </TabsContent>
        <TabsContent value="transfers" className="pt-4">
          <TransferQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

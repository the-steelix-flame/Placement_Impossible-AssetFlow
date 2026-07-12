import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS, ASSET_CONDITION } from "@/lib/constants";
import { useAllocations } from "./_components/useAllocations";
import { AllocateDialog } from "./_components/AllocateDialog";
import { TransferQueue } from "./_components/TransferQueue";

export default function AllocationsPage() {
  const { data: activeAllocations = [], isLoading } = useAllocations("active");

  const columns = [
    { header: "Asset Tag", accessorKey: "asset_tag" },
    { header: "Asset Name", accessorKey: "asset_name" },
    { header: "Current Holder", accessorKey: "employee_name" },
    { header: "Expected Return", accessorKey: "expected_return_date" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: any) => <StatusBadge config={ASSET_STATUS[row.status as keyof typeof ASSET_STATUS]} />
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: () => <Button variant="outline" size="sm">Manage</Button>
    }
  ];

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
          {isLoading ? <div>Loading...</div> : <DataTable columns={columns} data={activeAllocations} />}
        </TabsContent>
        <TabsContent value="overdue">
          <DataTable columns={columns} data={[]} />
        </TabsContent>
        <TabsContent value="returned">
          <DataTable columns={columns} data={[]} />
        </TabsContent>
        <TabsContent value="transfers" className="pt-4">
          <TransferQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

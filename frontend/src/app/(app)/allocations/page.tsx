import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS, ASSET_CONDITION } from "@/lib/constants";

export default function AllocationsPage() {
  const activeAllocations = [
    { id: "1", asset_tag: "AF-0114", asset_name: "MacBook Pro M3", holder: "Priya Sharma", expected_return: "2026-08-01", status: "ALLOCATED" }
  ];

  const columns = [
    { header: "Asset Tag", accessorKey: "asset_tag" },
    { header: "Asset Name", accessorKey: "asset_name" },
    { header: "Current Holder", accessorKey: "holder" },
    { header: "Expected Return", accessorKey: "expected_return" },
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
        <Button>Allocate Asset</Button>
      </PageHeader>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active Allocations</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="returned">Recently Returned</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <DataTable columns={columns} data={activeAllocations} />
        </TabsContent>
        <TabsContent value="overdue">
          <DataTable columns={columns} data={[]} />
        </TabsContent>
        <TabsContent value="returned">
          <DataTable columns={columns} data={[]} />
        </TabsContent>
        <TabsContent value="transfers">
          <DataTable columns={columns} data={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

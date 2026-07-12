import React from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TRANSFER_STATUS } from "@/lib/constants";
import { Check, X } from "lucide-react";

type TransferRow = {
  id: string;
  asset_tag: string;
  asset_name: string;
  from: string;
  to: string;
  status: keyof typeof TRANSFER_STATUS;
  date: string;
};

export function TransferQueue() {
  const mockTransfers: TransferRow[] = [
    {
      id: "1",
      asset_tag: "AF-0114",
      asset_name: "MacBook Pro M3",
      from: "Priya Sharma",
      to: "Alex Chen",
      status: "REQUESTED",
      date: "2026-07-11"
    }
  ];

  const columns = [
    { header: "Date", accessorKey: "date" },
    { header: "Asset", accessorKey: "asset_name" },
    { header: "Current Holder", accessorKey: "from" },
    { header: "Requested By", accessorKey: "to" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: TransferRow) => <StatusBadge config={TRANSFER_STATUS[row.status]} />
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: () => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
            <Check className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <X className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Pending Transfer Requests</h3>
      </div>
      <DataTable columns={columns} data={mockTransfers} />
    </div>
  );
}

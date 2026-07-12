import React from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TRANSFER_STATUS } from "@/lib/constants";
import { Check, X } from "lucide-react";
import { useTransfers, useDecideTransfer } from "./useTransfers";

export function TransferQueue() {
  const { data: transfers = [], isLoading } = useTransfers("REQUESTED");
  const decideMutation = useDecideTransfer();

  const handleApprove = (id: string) => {
    decideMutation.mutate({ id, approve: true });
  };

  const handleReject = (id: string) => {
    decideMutation.mutate({ id, approve: false, note: "Rejected via UI" });
  };


  const columns = [
    { header: "Date", accessorKey: "date" },
    { header: "Asset", accessorKey: "asset_name" },
    { header: "Current Holder", accessorKey: "from" },
    { header: "Requested By", accessorKey: "to" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: any) => <StatusBadge config={TRANSFER_STATUS[row.status as keyof typeof TRANSFER_STATUS]} />
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" size="sm" 
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={() => handleApprove(row.id)}
            disabled={decideMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button 
            variant="outline" size="sm" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleReject(row.id)}
            disabled={decideMutation.isPending}
          >
            <X className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      )
    }
  ];

  if (isLoading) return <div>Loading transfer requests...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Pending Transfer Requests</h3>
      </div>
      <DataTable columns={columns} data={transfers} />
    </div>
  );
}

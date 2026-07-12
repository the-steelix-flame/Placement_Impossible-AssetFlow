import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TRANSFER_STATUS } from "@/lib/constants";
import type { TransferRequest } from "@/lib/types";
import { Check, X } from "lucide-react";
import { useDecideTransfer, useTransfers } from "./useTransfers";

export function TransferQueue() {
  const { data: transfers = [], isLoading, isError } = useTransfers("REQUESTED");
  const decideMutation = useDecideTransfer();

  const columns = [
    { header: "Date", accessorKey: "created_at", cell: (row: TransferRequest) => new Date(row.created_at).toLocaleDateString() },
    { header: "Asset", accessorKey: "asset_tag", cell: (row: TransferRequest) => row.asset_tag ?? row.asset?.asset_tag ?? "-" },
    { header: "Requested By", accessorKey: "requested_by_id", cell: (row: TransferRequest) => row.requested_by_name ?? row.requested_by_id ?? row.requested_by ?? "-" },
    {
      header: "Target",
      accessorKey: "to_employee_id",
      cell: (row: TransferRequest) => row.to_employee_name ?? row.to_department_name ?? row.to_employee_id ?? row.to_department_id ?? "-",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: TransferRequest) => <StatusBadge config={TRANSFER_STATUS[row.status]} />,
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (row: TransferRequest) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => decideMutation.mutate({ id: row.id, approve: true })}
            disabled={decideMutation.isPending}
          >
            <Check className="mr-1 h-4 w-4" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => decideMutation.mutate({ id: row.id, approve: false, note: "Rejected via UI" })}
            disabled={decideMutation.isPending}
          >
            <X className="mr-1 h-4 w-4" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading transfer requests...</div>;
  }

  if (isError) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load transfer requests.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Pending Transfer Requests</h3>
      </div>
      <DataTable columns={columns} data={transfers} />
    </div>
  );
}

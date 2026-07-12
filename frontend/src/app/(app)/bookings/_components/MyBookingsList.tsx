import React from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useBookings, useCancelBooking } from "./useBookings";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { BOOKING_STATUS } from "@/lib/constants";
import type { Booking } from "@/lib/types";

export function MyBookingsList() {
  const { data: bookings = [], isLoading } = useBookings(undefined, undefined, undefined, true);
  const myBookings = bookings;
  
  const cancelMutation = useCancelBooking();

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const columns: DataTableColumn<Booking>[] = [
    { header: "Asset Tag", accessorKey: "asset_tag", cell: (row) => row.asset_tag ?? row.asset?.asset_tag ?? "-" },
    { 
      header: "Starts At", 
      accessorKey: "starts_at",
      cell: (row) => format(new Date(row.starts_at), "MMM d, h:mm a")
    },
    { 
      header: "Ends At", 
      accessorKey: "ends_at",
      cell: (row) => format(new Date(row.ends_at), "MMM d, h:mm a")
    },
    { header: "Purpose", accessorKey: "purpose", cell: (row) => row.purpose ?? "-" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row) => <StatusBadge config={BOOKING_STATUS[row.status]} />
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (row) => (
        row.status === "CONFIRMED" && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleCancel(row.id)}
            disabled={cancelMutation.isPending}
          >
            Cancel
          </Button>
        )
      )
    }
  ];

  if (isLoading) return <div>Loading your bookings...</div>;

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={myBookings} />
    </div>
  );
}

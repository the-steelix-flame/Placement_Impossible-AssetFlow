import React from "react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useBookings, useCancelBooking } from "./useBookings";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export function MyBookingsList() {
  const { data: bookings = [], isLoading } = useBookings(undefined, undefined, undefined);
  // Ideally we filter by mine=true but we just use all bookings for mock
  const myBookings = bookings;
  
  const cancelMutation = useCancelBooking();

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const columns = [
    { header: "Asset Tag", accessorKey: "asset_tag" },
    { 
      header: "Starts At", 
      accessorKey: "starts_at",
      cell: (row: any) => format(new Date(row.starts_at), "MMM d, h:mm a")
    },
    { 
      header: "Ends At", 
      accessorKey: "ends_at",
      cell: (row: any) => format(new Date(row.ends_at), "MMM d, h:mm a")
    },
    { header: "Purpose", accessorKey: "purpose" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: any) => <StatusBadge config={{ 
        label: row.status, 
        color: row.status === "CONFIRMED" ? "text-emerald-700" : "text-gray-700", 
        bg: row.status === "CONFIRMED" ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200" 
      }} />
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
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

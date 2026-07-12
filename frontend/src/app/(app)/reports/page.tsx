"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentAllocationChart } from "./_components/DepartmentAllocationChart";
import { BookingHeatmap } from "./_components/BookingHeatmap";

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Reports & Analytics"
        description="View asset utilization and allocation summaries across departments."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Allocation Summary</CardTitle>
            <CardDescription>Total assets vs. currently allocated, per department</CardDescription>
          </CardHeader>
          <CardContent className="border-t pt-4">
            <DepartmentAllocationChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Heatmap</CardTitle>
            <CardDescription>Confirmed bookings by weekday and start hour</CardDescription>
          </CardHeader>
          <CardContent className="border-t pt-4">
            <BookingHeatmap />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

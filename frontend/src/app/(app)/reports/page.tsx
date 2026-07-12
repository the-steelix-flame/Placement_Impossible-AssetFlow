import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Reports & Analytics" 
        description="View asset utilization and allocation summaries across departments."
      >
        <Button variant="outline">Export CSV</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Allocation Summary</CardTitle>
            <CardDescription>Number of assets allocated per department</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-slate-50 rounded-b-xl border-t">
            <p className="text-muted-foreground">Bar chart placeholder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Heatmap</CardTitle>
            <CardDescription>Resource utilization by day and hour</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-slate-50 rounded-b-xl border-t">
            <p className="text-muted-foreground">Heatmap placeholder</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

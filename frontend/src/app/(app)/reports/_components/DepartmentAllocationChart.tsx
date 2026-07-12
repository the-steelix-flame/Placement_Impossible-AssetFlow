"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { UtilizationReportRow } from "@/lib/types";

export function DepartmentAllocationChart() {
  const { data = [], isLoading, isError } = useApiQuery<UtilizationReportRow[]>(
    ["reports", "utilization"],
    "/reports/utilization"
  );

  if (isLoading) {
    return <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }
  if (isError) {
    return <div className="flex h-80 items-center justify-center text-sm text-destructive">Could not load this report.</div>;
  }
  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center">
        <EmptyState title="No departments yet" description="Utilization appears once departments hold assets." />
      </div>
    );
  }

  return (
    <div className="reports-viz h-80">
      <style>{`
        .reports-viz { --bar-total: #1baf7a; --bar-allocated: #2a78d6; --chart-ink: #52514e; --chart-grid: #e1e0d9; }
        .dark .reports-viz { --bar-total: #199e70; --bar-allocated: #3987e5; --chart-ink: #c3c2b7; --chart-grid: #2c2c2a; }
      `}</style>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="department"
            tick={{ fill: "var(--chart-ink)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--chart-ink)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="total_assets" name="Total Assets" fill="var(--bar-total)" barSize={20} radius={[4, 4, 0, 0]} />
          <Bar dataKey="allocated" name="Allocated" fill="var(--bar-allocated)" barSize={20} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

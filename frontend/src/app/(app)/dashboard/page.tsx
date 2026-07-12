"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, PackageCheck, Plus, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS } from "@/lib/constants";
import type { DashboardKpis, OverdueAllocation } from "@/lib/types";
import { useApiQuery } from "@/hooks/useApiQuery";

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useApiQuery<DashboardKpis>(
    ["dashboard", "kpis"],
    "/dashboard/kpis",
  );
  const { data: overdue = [], isLoading: overdueLoading } = useApiQuery<OverdueAllocation[]>(
    ["dashboard", "overdue"],
    "/dashboard/overdue",
  );

  const cards = [
    { label: "Total assets", value: kpis?.total_assets ?? 0, detail: `${kpis?.available ?? 0} available` },
    { label: "Open allocations", value: kpis?.active_allocations ?? 0, detail: `${kpis?.overdue_returns ?? 0} overdue` },
    { label: "Maintenance queue", value: kpis?.open_maintenance ?? 0, detail: `${kpis?.pending_maintenance ?? 0} pending` },
    { label: "Upcoming bookings", value: kpis?.upcoming_bookings ?? 0, detail: "Next 7 days" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Operational overview across assets, allocations, bookings, and maintenance.">
        <Link className={buttonVariants()} href="/assets/new">
          <Plus className="size-4" />
          Register asset
        </Link>
      </PageHeader>
      <div className="space-y-6 p-6">
        {kpisError ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-destructive">Could not load dashboard KPIs.</div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((kpi) => (
            <Card key={kpi.label} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-3xl">{kpisLoading ? "..." : kpi.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{kpisLoading ? "Loading" : kpi.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Priority queue</CardTitle>
              <CardDescription>Items needing attention before the next handoff.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueLoading ? (
                <p className="text-sm text-muted-foreground">Loading overdue allocations...</p>
              ) : overdue.length ? (
                overdue.map((item) => (
                  <div key={item.allocation_id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {item.asset_tag} - {item.asset_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Held by {item.holder}; {item.days_overdue} days overdue
                      </p>
                    </div>
                    <StatusBadge config={ASSET_STATUS.ALLOCATED} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No overdue allocations.</p>
              )}
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <AlertTriangle className="size-5 shrink-0" />
                <p className="text-sm">Booking overlap and allocation conflicts are surfaced as actionable queue items.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Common paths for the demo flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Asset directory", href: "/assets", icon: PackageCheck },
                { label: "Register asset", href: "/assets/new", icon: Plus },
                { label: "Book resource", href: "/bookings", icon: CalendarClock },
                { label: "Raise maintenance", href: "/maintenance", icon: Wrench },
              ].map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.label}
                    className={buttonVariants({ variant: "outline", className: "w-full justify-between" })}
                    href={action.href}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {action.label}
                    </span>
                    <ArrowRight className="size-4" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

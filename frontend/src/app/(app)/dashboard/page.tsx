import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, PackageCheck, Plus, Wrench } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS } from "@/lib/constants";
import { mockKpis, mockOverdue } from "@/lib/mock-data";

const kpis = [
  { label: "Total assets", value: mockKpis.total_assets, detail: `${mockKpis.available} available` },
  { label: "Open allocations", value: mockKpis.active_allocations, detail: `${mockKpis.overdue_returns} overdue` },
  { label: "Maintenance queue", value: mockKpis.open_maintenance, detail: `${mockKpis.pending_maintenance} pending` },
  { label: "Upcoming bookings", value: mockKpis.upcoming_bookings, detail: "Next 7 days" },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Operational overview across assets, allocations, bookings, and maintenance.">
        <Link className={buttonVariants()} href="/assets/new">
          <Plus className="size-4" />
          Register asset
        </Link>
      </PageHeader>
      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-3xl">{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{kpi.detail}</p>
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
              {mockOverdue.map((item) => (
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
              ))}
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
                  <Button key={action.label} variant="outline" className="w-full justify-between" render={<Link href={action.href} />}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {action.label}
                    </span>
                    <ArrowRight className="size-4" />
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AUDIT_CYCLE_STATUS } from "@/lib/constants";
import { useAuditCycle, useAuditItems, useStartAuditCycle, useCloseAuditCycle } from "../_components/useAudits";
import { ChecklistRow } from "../_components/ChecklistRow";
import { DiscrepancyReport } from "../_components/DiscrepancyReport";

export default function AuditCycleDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: cycle, isLoading: cycleLoading } = useAuditCycle(id);
  const { data: items = [], isLoading: itemsLoading } = useAuditItems(id);
  const startMutation = useStartAuditCycle();
  const closeMutation = useCloseAuditCycle();

  if (cycleLoading || !cycle) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading audit cycle...</div>
      </div>
    );
  }

  const isDraft = cycle.status === "DRAFT";
  const isClosed = cycle.status === "CLOSED";

  return (
    <div className="container mx-auto py-6">
      <PageHeader title={cycle.name} description={cycle.scope_location ?? cycle.scope_department?.name ?? "Organization-wide"}>
        <Link className={buttonVariants({ variant: "outline" })} href="/audits">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge config={AUDIT_CYCLE_STATUS[cycle.status]} />
            <CardTitle className="text-base font-normal text-muted-foreground">
              {cycle.starts_on} → {cycle.ends_on}
            </CardTitle>
          </div>
          {isDraft ? (
            <Button onClick={() => startMutation.mutate(id)} disabled={startMutation.isPending}>
              {startMutation.isPending ? "Starting..." : "Start Audit"}
            </Button>
          ) : null}
          {!isDraft && !isClosed ? (
            <Button
              variant="destructive"
              onClick={() => closeMutation.mutate(id)}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? "Closing..." : "Close Cycle"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isDraft ? (
            <EmptyState title="Audit not started" description="Start the audit to snapshot in-scope assets into the checklist." />
          ) : itemsLoading ? (
            <div className="text-sm text-muted-foreground">Loading checklist...</div>
          ) : !items.length ? (
            <EmptyState title="No assets in scope" description="This cycle has no assets to verify." />
          ) : (
            <div>
              {items.map((item) => (
                <ChecklistRow key={item.id} item={item} cycleId={id} disabled={isClosed} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isDraft ? (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Discrepancy Report</h3>
          <DiscrepancyReport cycleId={id} />
        </div>
      ) : null}
    </div>
  );
}

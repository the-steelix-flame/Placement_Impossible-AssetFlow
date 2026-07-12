"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_CONDITION, ASSET_STATUS } from "@/lib/constants";
import type { AssetPassport } from "@/lib/types";
import { useApiQuery } from "@/hooks/useApiQuery";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AssetPassportPage() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isLoading, isError } = useApiQuery<AssetPassport>(["asset-passport", id], `/assets/${id}/passport`, {
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Asset passport" description="Loading registration, allocation, maintenance, booking, and audit history.">
          <Link className={buttonVariants({ variant: "outline" })} href="/assets">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </PageHeader>
        <div className="p-6">
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading passport...</div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Asset passport" description="Registration, allocations, maintenance, bookings, and audits in one timeline.">
          <Link className={buttonVariants({ variant: "outline" })} href="/assets">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </PageHeader>
        <div className="p-6">
          <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load this asset passport.</div>
        </div>
      </div>
    );
  }

  const { asset, timeline } = data;

  return (
    <div>
      <PageHeader title={`${asset.asset_tag} - ${asset.name}`} description="Registration, allocations, maintenance, bookings, and audits in one timeline.">
        <Link className={buttonVariants({ variant: "outline" })} href="/assets">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </PageHeader>
      <div className="grid gap-5 p-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Snapshot</CardTitle>
              <CardDescription>{asset.category_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge config={ASSET_STATUS[asset.status]} />
                <StatusBadge config={ASSET_CONDITION[asset.condition]} />
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="font-medium">Location</dt>
                    <dd className="text-muted-foreground">{asset.location ?? "-"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="font-medium">Department</dt>
                    <dd className="text-muted-foreground">{asset.department_name ?? "-"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="font-medium">Acquired</dt>
                    <dd className="text-muted-foreground">{asset.acquisition_date ? formatDate(asset.acquisition_date) : "-"}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Asset tag</span>
                <span className="font-medium">{asset.asset_tag}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Serial</span>
                <span className="font-medium">{asset.serial_number ?? "-"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bookable</span>
                <span className="font-medium">{asset.is_bookable ? "Yes" : "No"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Passport timeline</CardTitle>
            <CardDescription>Newest lifecycle events first.</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline.length ? (
              <ol className="relative space-y-6 border-l pl-6">
                {timeline.map((event) => (
                  <li key={`${event.kind}-${event.at}`}>
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="rounded-lg border bg-background p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">{event.title}</p>
                        <span className="text-xs text-muted-foreground">{formatDateTime(event.at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{event.detail || "-"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No passport events yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

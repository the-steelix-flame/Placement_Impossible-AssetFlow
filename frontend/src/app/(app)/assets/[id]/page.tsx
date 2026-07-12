import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_CONDITION, ASSET_STATUS } from "@/lib/constants";
import { mockAssets, mockPassportEvents } from "@/lib/mock-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AssetPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = mockAssets.find((item) => item.id === id);

  if (!asset) {
    notFound();
  }

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
            <ol className="relative space-y-6 border-l pl-6">
              {mockPassportEvents.map((event) => (
                <li key={`${event.kind}-${event.at}`}>
                  <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">{event.title}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(event.at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

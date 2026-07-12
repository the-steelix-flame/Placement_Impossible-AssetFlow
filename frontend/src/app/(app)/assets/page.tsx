"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_CONDITION, ASSET_STATUS } from "@/lib/constants";
import type { Asset, AssetCategory, AssetStatus } from "@/lib/types";
import { useApiQuery } from "@/hooks/useApiQuery";

const statusOptions: Array<AssetStatus | "ALL"> = ["ALL", "AVAILABLE", "ALLOCATED", "UNDER_MAINTENANCE", "RETIRED"];

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "ALL">("ALL");
  const [categoryId, setCategoryId] = useState("ALL");
  const {
    data: assets = [],
    isLoading: assetsLoading,
    isError: assetsError,
  } = useApiQuery<Asset[]>(["assets"], "/assets");
  const { data: categories = [] } = useApiQuery<AssetCategory[]>(["asset-categories"], "/asset-categories");

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        `${asset.asset_tag} ${asset.name} ${asset.serial_number ?? ""} ${asset.location ?? ""} ${asset.department_name ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = status === "ALL" || asset.status === status;
      const matchesCategory = categoryId === "ALL" || asset.category_id === categoryId;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [assets, categoryId, search, status]);

  return (
    <div>
      <PageHeader title="Assets" description="Registry, filters, and Asset Passport entry points.">
        <Link className={buttonVariants()} href="/assets/new">
          <Plus className="size-4" />
          Register asset
        </Link>
      </PageHeader>
      <div className="space-y-5 p-6">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by tag, name, or serial" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select
              className="h-8 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40"
              value={status}
              onChange={(event) => setStatus(event.target.value as AssetStatus | "ALL")}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All statuses" : option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {assetsError ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load assets from the API.</div>
        ) : assetsLoading ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading assets...</div>
        ) : filteredAssets.length ? (
          <DataTable
            data={filteredAssets}
            columns={[
              {
                header: "Asset",
                accessorKey: "asset_tag",
                cell: (asset) => (
                  <Link href={`/assets/${asset.id}`} className="font-medium text-primary hover:underline">
                    {asset.asset_tag}
                    <span className="ml-2 text-foreground">{asset.name}</span>
                  </Link>
                ),
              },
              { header: "Category", accessorKey: "category_name", cell: (asset) => asset.category_name ?? "-" },
              { header: "Owner", accessorKey: "department_name", cell: (asset) => asset.department_name ?? "-" },
              { header: "Location", accessorKey: "location", cell: (asset) => asset.location ?? "-" },
              { header: "Condition", accessorKey: "condition", cell: (asset) => <StatusBadge config={ASSET_CONDITION[asset.condition]} /> },
              { header: "Status", accessorKey: "status", cell: (asset) => <StatusBadge config={ASSET_STATUS[asset.status]} /> },
            ]}
          />
        ) : (
          <EmptyState title="No assets found" description="Try another search or register a new asset." />
        )}
      </div>
    </div>
  );
}

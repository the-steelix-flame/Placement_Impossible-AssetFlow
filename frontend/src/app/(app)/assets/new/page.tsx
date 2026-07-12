"use client";

import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS } from "@/lib/constants";
import { mockCategories, mockDepartments } from "@/lib/mock-data";

export default function NewAssetPage() {
  const [categoryId, setCategoryId] = useState(mockCategories[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const selectedCategory = useMemo(() => mockCategories.find((category) => category.id === categoryId) ?? mockCategories[0], [categoryId]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Ready to save once the backend is running with the Supabase JWT.");
  }

  return (
    <div>
      <PageHeader title="Register asset" description="Create an asset with category fields, ownership, and initial condition.">
        <Link className={buttonVariants({ variant: "outline" })} href="/assets">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </PageHeader>
      <div className="grid gap-5 p-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Asset details</CardTitle>
            <CardDescription>Asset tags are assigned by the database trigger.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Asset name</Label>
                <Input id="name" placeholder="MacBook Pro 14, Boardroom A, Projector Kit" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  {mockCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial number</Label>
                <Input id="serialNumber" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Owning department</Label>
                <select id="department" className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40">
                  {mockDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Bengaluru HQ - 3F" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">Acquisition date</Label>
                <Input id="acquisitionDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">Acquisition cost</Label>
                <Input id="acquisitionCost" type="number" min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <select id="condition" className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40">
                  {["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex h-8 items-center gap-2 rounded-lg border px-3 text-sm">
                <input type="checkbox" className="size-4" />
                Bookable shared resource
              </label>
              {selectedCategory?.field_schema.map((field) => (
                <div key={String(field.key)} className="space-y-2">
                  <Label htmlFor={String(field.key)}>{String(field.label)}</Label>
                  <Input id={String(field.key)} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} />
                </div>
              ))}
              <div className="md:col-span-2">
                {message ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
                <Button type="submit">Save asset</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Photo</CardTitle>
              <CardDescription>Uploads target the asset-photos bucket.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid aspect-4/3 place-items-center rounded-lg border border-dashed bg-muted text-center">
                <div>
                  <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">Choose image</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG or JPG</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Initial state</CardTitle>
              <CardDescription>New assets enter the lifecycle as available.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge config={ASSET_STATUS.AVAILABLE} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

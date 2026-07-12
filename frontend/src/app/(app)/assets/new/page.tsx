"use client";

import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS } from "@/lib/constants";
import { api } from "@/lib/api";
import type { Asset, AssetCategory, AssetFieldDefinition, Department } from "@/lib/types";
import { useApiQuery } from "@/hooks/useApiQuery";

function fieldInputType(field: AssetFieldDefinition) {
  if (field.type === "number" || field.type === "date") {
    return field.type;
  }

  return "text";
}

export default function NewAssetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");
  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useApiQuery<AssetCategory[]>(
    ["asset-categories"],
    "/asset-categories",
  );
  const { data: departments = [], isLoading: departmentsLoading } = useApiQuery<Department[]>(["departments"], "/departments");
  const selectedCategoryId = categoryId || categories[0]?.id || "";
  const selectedCategory = useMemo(() => categories.find((category) => category.id === selectedCategoryId), [categories, selectedCategoryId]);

  const createAsset = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Asset>("/assets", payload),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setMessage(`Created ${asset.asset_tag}. Opening its passport...`);
      router.push(`/assets/${asset.id}`);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCategory) {
      setMessage("Load at least one active category before saving an asset.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const acquisitionCost = String(formData.get("acquisition_cost") ?? "").trim();
    const customFields: Record<string, string | number | boolean> = {};

    selectedCategory.field_schema.forEach((field) => {
      const rawValue = formData.get(`custom_${field.key}`);

      if (rawValue == null || rawValue === "") {
        return;
      }

      if (field.type === "number") {
        customFields[field.key] = Number(rawValue);
      } else if (field.type === "boolean") {
        customFields[field.key] = rawValue === "on" || rawValue === "true";
      } else {
        customFields[field.key] = String(rawValue);
      }
    });

    createAsset.mutate({
      name: String(formData.get("name") ?? "").trim(),
      category_id: selectedCategory.id,
      serial_number: String(formData.get("serial_number") ?? "").trim() || null,
      acquisition_date: String(formData.get("acquisition_date") ?? "").trim() || null,
      acquisition_cost: acquisitionCost ? Number(acquisitionCost) : null,
      condition: String(formData.get("condition") ?? "GOOD"),
      location: String(formData.get("location") ?? "").trim() || null,
      department_id: String(formData.get("department_id") ?? "").trim() || null,
      is_bookable: formData.get("is_bookable") === "on",
      custom_fields: customFields,
      photo_url: null,
    });
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
                <Input id="name" name="name" placeholder="MacBook Pro 14, Boardroom A, Projector Kit" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40"
                  value={selectedCategoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={categoriesLoading || categoriesError}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial number</Label>
                <Input id="serialNumber" name="serial_number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Owning department</Label>
                <select
                  id="department"
                  name="department_id"
                  className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40"
                  disabled={departmentsLoading}
                >
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="Bengaluru HQ - 3F" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">Acquisition date</Label>
                <Input id="acquisitionDate" name="acquisition_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">Acquisition cost</Label>
                <Input id="acquisitionCost" name="acquisition_cost" type="number" min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <select id="condition" name="condition" className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40">
                  {["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex h-8 items-center gap-2 rounded-lg border px-3 text-sm">
                <input type="checkbox" name="is_bookable" className="size-4" />
                Bookable shared resource
              </label>
              {selectedCategory?.field_schema.map((field) => (
                <div key={String(field.key)} className="space-y-2">
                  <Label htmlFor={String(field.key)}>{String(field.label)}</Label>
                  {field.type === "boolean" ? (
                    <label className="flex h-8 items-center gap-2 rounded-lg border px-3 text-sm">
                      <input id={field.key} name={`custom_${field.key}`} type="checkbox" className="size-4" />
                      Yes
                    </label>
                  ) : field.type === "select" && field.options?.length ? (
                    <select
                      id={field.key}
                      name={`custom_${field.key}`}
                      className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40"
                      required={field.required}
                    >
                      <option value="">Select</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input id={field.key} name={`custom_${field.key}`} type={fieldInputType(field)} required={field.required} />
                  )}
                </div>
              ))}
              <div className="md:col-span-2">
                {categoriesError ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not load asset categories.</p> : null}
                {createAsset.error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createAsset.error.message}</p> : null}
                {message ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
                <Button type="submit" disabled={createAsset.isPending || categoriesLoading || !selectedCategory}>
                  {createAsset.isPending ? "Saving..." : "Save asset"}
                </Button>
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

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS, ROLE_LABELS } from "@/lib/constants";
import { mockCategories, mockDepartments, mockEmployees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tabs = ["Departments", "Categories", "Directory"] as const;

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Departments");

  return (
    <div>
      <PageHeader title="Organization" description="Departments, categories, and employee role management.">
        <Button>
          <Plus className="size-4" />
          New item
        </Button>
      </PageHeader>
      <div className="space-y-5 p-6">
        <div className="inline-flex rounded-lg border bg-card p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "h-8 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors",
                activeTab === tab && "bg-primary text-primary-foreground",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Departments" ? (
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Hierarchy-ready departments with optional heads.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockDepartments}
                columns={[
                  { header: "Department", accessorKey: "name" },
                  { header: "Code", accessorKey: "code" },
                  { header: "Parent", accessorKey: "parent_id", cell: (row) => row.parent_id ?? "-" },
                  { header: "Status", accessorKey: "status", cell: () => <StatusBadge config={ASSET_STATUS.AVAILABLE} /> },
                ]}
              />
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "Categories" ? (
          <Card>
            <CardHeader>
              <CardTitle>Asset categories</CardTitle>
              <CardDescription>Custom fields drive the asset registration form.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockCategories}
                columns={[
                  { header: "Category", accessorKey: "name" },
                  { header: "Description", accessorKey: "description", cell: (row) => row.description ?? "-" },
                  { header: "Fields", accessorKey: "field_schema", cell: (row) => `${row.field_schema.length} custom` },
                  { header: "Status", accessorKey: "status", cell: () => <StatusBadge config={ASSET_STATUS.AVAILABLE} /> },
                ]}
              />
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "Directory" ? (
          <Card>
            <CardHeader>
              <CardTitle>Employee directory</CardTitle>
              <CardDescription>The promote action maps to the Admin-only role endpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockEmployees}
                columns={[
                  { header: "Employee", accessorKey: "full_name" },
                  { header: "Email", accessorKey: "email" },
                  { header: "Department", accessorKey: "department_name", cell: (row) => row.department_name ?? "-" },
                  { header: "Role", accessorKey: "role", cell: (row) => ROLE_LABELS[row.role] },
                ]}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

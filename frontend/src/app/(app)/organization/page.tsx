"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, EyeOff, RotateCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ACCESS_STATUS, ASSET_STATUS, ROLE_LABELS, SIGNUP_REQUEST_STATUS } from "@/lib/constants";
import { api } from "@/lib/api";
import type {
  AssetCategory,
  Department,
  Employee,
  JoinCode,
  JoinCodeRole,
  JoinRequest,
  RotateJoinCodeResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";

const tabs = ["Departments", "Categories", "Directory", "Access"] as const;
const joinableRoles: JoinCodeRole[] = ["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER"];

function LoadState({ loading, error }: { loading: boolean; error: boolean }) {
  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-destructive">Could not load records.</div>;
  }

  return null;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function JoinCodesPanel() {
  const queryClient = useQueryClient();
  const joinCodes = useApiQuery<JoinCode[]>(["join-codes"], "/join-codes");
  const [rotatedCodes, setRotatedCodes] = useState<Partial<Record<JoinCodeRole, string>>>({});
  const [revealed, setRevealed] = useState<Partial<Record<JoinCodeRole, boolean>>>({});
  const [copiedRole, setCopiedRole] = useState<JoinCodeRole | null>(null);

  const rotateMutation = useMutation<RotateJoinCodeResponse, Error, JoinCodeRole>({
    mutationFn: (role) => api.post<RotateJoinCodeResponse>(`/join-codes/${role}/rotate`),
    onSuccess: (data) => {
      setRotatedCodes((previous) => ({ ...previous, [data.role]: data.code }));
      setRevealed((previous) => ({ ...previous, [data.role]: true }));
      queryClient.invalidateQueries({ queryKey: ["join-codes"] });
    },
  });

  async function copyCode(role: JoinCodeRole, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedRole(role);
    window.setTimeout(() => setCopiedRole(null), 1500);
  }

  const codesByRole = new Map((joinCodes.data ?? []).map((code) => [code.role, code]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role join codes</CardTitle>
        <CardDescription>
          Show, copy, and share a code so people can request that role. Rotate to revoke the old one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoadState loading={joinCodes.isLoading} error={joinCodes.isError} />
        {!joinCodes.isLoading && !joinCodes.isError ? (
          <div className="space-y-3">
            {joinableRoles.map((role) => {
              const joinCode = codesByRole.get(role);
              // Prefer a freshly-rotated code; otherwise the plaintext the API returns.
              const actualCode = rotatedCodes[role] ?? joinCode?.code ?? "";
              const isRevealed = Boolean(revealed[role]);
              const display = actualCode && isRevealed ? actualCode : (joinCode?.masked_code ?? "No code generated");
              const isRotating = rotateMutation.isPending && rotateMutation.variables === role;

              return (
                <div key={role} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <p className="font-medium">{ROLE_LABELS[role]}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Last rotated {formatDate(joinCode?.last_rotated_at)}.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" onClick={() => rotateMutation.mutate(role)} disabled={isRotating}>
                        <RotateCw className={cn("size-4", isRotating && "animate-spin")} />
                        Rotate
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <code className="break-all text-sm font-semibold">{display}</code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto shrink-0"
                      aria-label={isRevealed ? `Hide ${ROLE_LABELS[role]} code` : `Show ${ROLE_LABELS[role]} code`}
                      title={isRevealed ? "Hide code" : "Show code"}
                      disabled={!actualCode}
                      onClick={() => setRevealed((previous) => ({ ...previous, [role]: !previous[role] }))}
                    >
                      {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={`Copy ${ROLE_LABELS[role]} code`}
                      title={actualCode ? "Copy code" : "No code to copy"}
                      disabled={!actualCode}
                      onClick={() => copyCode(role, actualCode)}
                    >
                      {copiedRole === role ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
            {rotateMutation.isError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{rotateMutation.error.message}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function JoinRequestsQueue() {
  const queryClient = useQueryClient();
  const requests = useApiQuery<JoinRequest[]>(
    ["join-requests", "pending"],
    "/join-requests?status=PENDING_APPROVAL",
  );

  const decideMutation = useMutation<unknown, Error, { id: string; action: "approve" | "reject" }>({
    mutationFn: ({ id, action }) =>
      action === "reject"
        ? api.post(`/join-requests/${id}/${action}`, { note: null })
        : api.post(`/join-requests/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join requests</CardTitle>
        <CardDescription>Approve only the people who should receive company data access.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoadState loading={requests.isLoading} error={requests.isError} />
        {!requests.isLoading && !requests.isError ? (
          <div className="space-y-3">
            {(requests.data ?? []).length === 0 ? (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No pending requests.</div>
            ) : (
              (requests.data ?? []).map((request) => {
                const approving = decideMutation.isPending && decideMutation.variables?.id === request.id && decideMutation.variables.action === "approve";
                const rejecting = decideMutation.isPending && decideMutation.variables?.id === request.id && decideMutation.variables.action === "reject";

                return (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{request.full_name}</p>
                          <StatusBadge config={SIGNUP_REQUEST_STATUS[request.status]} />
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{request.email}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ROLE_LABELS[request.requested_role]} requested on {formatDate(request.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => decideMutation.mutate({ id: request.id, action: "approve" })}
                          disabled={decideMutation.isPending}
                        >
                          {approving ? <RotateCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => decideMutation.mutate({ id: request.id, action: "reject" })}
                          disabled={decideMutation.isPending}
                        >
                          {rejecting ? <RotateCw className="size-4 animate-spin" /> : <X className="size-4" />}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {decideMutation.isError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{decideMutation.error.message}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Departments");
  const departments = useApiQuery<Department[]>(["departments"], "/departments");
  const categories = useApiQuery<AssetCategory[]>(["asset-categories"], "/asset-categories");
  const employees = useApiQuery<Employee[]>(["employees"], "/employees");

  return (
    <div>
      <PageHeader title="Organization" description="Departments, asset categories, directory, and workspace access." />
      <div className="space-y-5 p-6">
        <div className="inline-flex flex-wrap rounded-lg border bg-card p-1">
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
              <LoadState loading={departments.isLoading} error={departments.isError} />
              {!departments.isLoading && !departments.isError ? (
                <DataTable
                  data={departments.data ?? []}
                  columns={[
                    { header: "Department", accessorKey: "name" },
                    { header: "Code", accessorKey: "code" },
                    { header: "Parent", accessorKey: "parent_id", cell: (row) => row.parent_id ?? "-" },
                    {
                      header: "Status",
                      accessorKey: "status",
                      cell: (row) => <StatusBadge config={row.status === "ACTIVE" ? ASSET_STATUS.AVAILABLE : ASSET_STATUS.RETIRED} />,
                    },
                  ]}
                />
              ) : null}
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
              <LoadState loading={categories.isLoading} error={categories.isError} />
              {!categories.isLoading && !categories.isError ? (
                <DataTable
                  data={categories.data ?? []}
                  columns={[
                    { header: "Category", accessorKey: "name" },
                    { header: "Description", accessorKey: "description", cell: (row) => row.description ?? "-" },
                    { header: "Fields", accessorKey: "field_schema", cell: (row) => `${row.field_schema.length} custom` },
                    {
                      header: "Status",
                      accessorKey: "status",
                      cell: (row) => <StatusBadge config={row.status === "ACTIVE" ? ASSET_STATUS.AVAILABLE : ASSET_STATUS.RETIRED} />,
                    },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "Directory" ? (
          <Card>
            <CardHeader>
              <CardTitle>Employee directory</CardTitle>
              <CardDescription>Role and access status come from the organization employee row.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoadState loading={employees.isLoading} error={employees.isError} />
              {!employees.isLoading && !employees.isError ? (
                <DataTable
                  data={employees.data ?? []}
                  columns={[
                    { header: "Employee", accessorKey: "full_name" },
                    { header: "Email", accessorKey: "email" },
                    { header: "Department", accessorKey: "department_name", cell: (row) => row.department_name ?? "-" },
                    { header: "Role", accessorKey: "role", cell: (row) => ROLE_LABELS[row.role] },
                    {
                      header: "Access",
                      accessorKey: "access_status",
                      cell: (row) => <StatusBadge config={ACCESS_STATUS[row.access_status ?? "ACTIVE"]} />,
                    },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "Access" ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <JoinCodesPanel />
            <JoinRequestsQueue />
          </div>
        ) : null}
      </div>
    </div>
  );
}

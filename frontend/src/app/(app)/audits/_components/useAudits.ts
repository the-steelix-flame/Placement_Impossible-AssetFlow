import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { AuditCycle, AuditItem } from "@/lib/types";

export function useAuditCycles(status?: string) {
  return useQuery<AuditCycle[]>({
    queryKey: ["audit-cycles", status],
    queryFn: () => fetchApi<AuditCycle[]>(`/api/v1/audit-cycles${status ? `?status=${status}` : ""}`),
  });
}

export function useAuditCycle(id: string) {
  return useQuery<AuditCycle>({
    queryKey: ["audit-cycles", id],
    queryFn: () => fetchApi<AuditCycle>(`/api/v1/audit-cycles/${id}`),
    enabled: !!id,
  });
}

export function useAuditItems(cycleId: string) {
  return useQuery<AuditItem[]>({
    queryKey: ["audit-items", cycleId],
    queryFn: () => fetchApi<AuditItem[]>(`/api/v1/audit-cycles/${cycleId}/items`),
    enabled: !!cycleId,
  });
}

export function useAuditDiscrepancies(cycleId: string) {
  return useQuery<AuditItem[]>({
    queryKey: ["audit-discrepancies", cycleId],
    queryFn: () => fetchApi<AuditItem[]>(`/api/v1/audit-cycles/${cycleId}/discrepancies`),
    enabled: !!cycleId,
  });
}

export function useCreateAuditCycle() {
  const queryClient = useQueryClient();

  return useMutation<
    AuditCycle,
    Error,
    { name: string; scope_department_id?: string; scope_location?: string; starts_on: string; ends_on: string }
  >({
    mutationFn: (data) => fetchApi<AuditCycle>("/api/v1/audit-cycles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
    },
  });
}

export function useStartAuditCycle() {
  const queryClient = useQueryClient();

  return useMutation<AuditCycle, Error, string>({
    mutationFn: (id) => fetchApi<AuditCycle>(`/api/v1/audit-cycles/${id}/start`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-items", id] });
    },
  });
}

export function useCloseAuditCycle() {
  const queryClient = useQueryClient();

  return useMutation<AuditCycle, Error, string>({
    mutationFn: (id) => fetchApi<AuditCycle>(`/api/v1/audit-cycles/${id}/close`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["audit-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-items", id] });
      queryClient.invalidateQueries({ queryKey: ["audit-discrepancies", id] });
    },
  });
}

export function useUpdateAuditItem(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    AuditItem,
    Error,
    { id: string; result: string; notes?: string }
  >({
    mutationFn: ({ id, ...data }) => fetchApi<AuditItem>(`/api/v1/audit-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-items", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["audit-discrepancies", cycleId] });
    },
  });
}

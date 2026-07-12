import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { MaintenanceRequest } from "@/lib/types";

export function useMaintenanceRequests(params?: { status?: string; mine?: boolean }) {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.mine) query.append("mine", "true");
  const qs = query.toString();

  return useQuery<MaintenanceRequest[]>({
    queryKey: ["maintenance-requests", params?.status, params?.mine],
    queryFn: () => fetchApi<MaintenanceRequest[]>(`/api/v1/maintenance-requests${qs ? `?${qs}` : ""}`),
  });
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    MaintenanceRequest,
    Error,
    { asset_id: string; title: string; description?: string; priority?: string; photo_url?: string }
  >({
    mutationFn: (data) => fetchApi<MaintenanceRequest>("/api/v1/maintenance-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
  });
}

function useMaintenanceAction(action: "approve" | "reject" | "assign" | "start" | "resolve") {
  const queryClient = useQueryClient();

  return useMutation<
    MaintenanceRequest,
    Error,
    { id: string; reason?: string; technician_name?: string; resolution_notes?: string }
  >({
    mutationFn: ({ id, ...data }) => fetchApi<MaintenanceRequest>(`/api/v1/maintenance-requests/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
  });
}

export const useApproveRequest = () => useMaintenanceAction("approve");
export const useRejectRequest = () => useMaintenanceAction("reject");
export const useAssignRequest = () => useMaintenanceAction("assign");
export const useStartRequest = () => useMaintenanceAction("start");
export const useResolveRequest = () => useMaintenanceAction("resolve");

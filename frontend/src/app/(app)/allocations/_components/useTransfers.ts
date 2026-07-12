import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { TransferRequest, ConflictError } from "@/lib/types";

export function useTransfers(status?: string) {
  return useQuery<TransferRequest[]>({
    queryKey: ["transfers", status],
    queryFn: () => {
      const url = status ? `/api/v1/transfer-requests?status=${status}` : `/api/v1/transfer-requests`;
      return fetchApi<TransferRequest[]>(url);
    },
  });
}

export function useRequestTransfer() {
  const queryClient = useQueryClient();

  return useMutation<
    TransferRequest,
    ConflictError | Error,
    { asset_id: string; to_employee_id?: string; to_department_id?: string; reason?: string }
  >({
    mutationFn: (data) => fetchApi<TransferRequest>("/api/v1/transfer-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useDecideTransfer() {
  const queryClient = useQueryClient();

  return useMutation<
    TransferRequest,
    Error,
    { id: string; approve: boolean; note?: string }
  >({
    mutationFn: ({ id, ...data }) => fetchApi<TransferRequest>(`/api/v1/transfer-requests/${id}/decide`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}

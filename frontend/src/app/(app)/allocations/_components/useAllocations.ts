import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Allocation, ConflictError } from "@/lib/types";

export function useAllocations(state?: "active" | "overdue" | "returned") {
  return useQuery<Allocation[]>({
    queryKey: ["allocations", state],
    queryFn: () => {
      const url = state ? `/api/v1/allocations?state=${state}` : `/api/v1/allocations`;
      return fetchApi<Allocation[]>(url);
    },
  });
}

export function useAllocateAsset() {
  const queryClient = useQueryClient();

  return useMutation<
    Allocation,
    ConflictError | Error,
    { asset_id: string; employee_id?: string; department_id?: string; expected_return_date?: string }
  >({
    mutationFn: (data) => fetchApi<Allocation>("/api/v1/allocations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();

  return useMutation<
    Allocation,
    Error,
    { id: string; return_condition?: string; return_notes?: string }
  >({
    mutationFn: ({ id, ...data }) => fetchApi<Allocation>(`/api/v1/allocations/${id}/return`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}

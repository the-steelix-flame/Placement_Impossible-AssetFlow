import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Booking, ConflictError } from "@/lib/types";

export function useBookings(asset_id?: string, date_from?: string, date_to?: string, mine?: boolean) {
  return useQuery<Booking[]>({
    queryKey: ["bookings", asset_id, date_from, date_to, mine],
    queryFn: () => {
      const params = new URLSearchParams();
      if (asset_id) params.append("asset", asset_id);
      if (date_from) params.append("date_from", date_from);
      if (date_to) params.append("date_to", date_to);
      if (mine) params.append("mine", "true");
      const qs = params.toString();
      const url = `/api/v1/bookings${qs ? `?${qs}` : ""}`;
      return fetchApi<Booking[]>(url);
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation<
    Booking,
    ConflictError | Error,
    { asset_id: string; starts_at: string; ends_at: string; purpose?: string }
  >({
    mutationFn: (data) => fetchApi<Booking>("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation<
    Booking,
    Error,
    string
  >({
    mutationFn: (id) => fetchApi<Booking>(`/api/v1/bookings/${id}/cancel`, {
      method: "POST",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

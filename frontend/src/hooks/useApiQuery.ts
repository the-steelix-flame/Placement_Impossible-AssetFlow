"use client";

import {
  QueryClient,
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function useApiQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, "queryKey" | "queryFn">,
): UseQueryResult<TData, Error>;
export function useApiQuery<TData>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseQueryOptions<TData, Error>, "queryKey" | "queryFn">,
): UseQueryResult<TData, Error>;
export function useApiQuery<TData>(
  queryKey: QueryKey,
  queryFnOrEndpoint: (() => Promise<TData>) | string,
  options?: Omit<UseQueryOptions<TData, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey,
    queryFn:
      typeof queryFnOrEndpoint === "string"
        ? () => fetchApi<TData>(queryFnOrEndpoint)
        : queryFnOrEndpoint,
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
): UseMutationResult<TData, Error, TVariables>;
export function useApiMutation<TData, TVariables>(
  endpoint: string,
  method?: "POST" | "PATCH" | "DELETE",
  options?: UseMutationOptions<TData, Error, TVariables>,
): UseMutationResult<TData, Error, TVariables>;
export function useApiMutation<TData, TVariables>(
  mutationFnOrEndpoint: ((variables: TVariables) => Promise<TData>) | string,
  methodOrOptions?: "POST" | "PATCH" | "DELETE" | UseMutationOptions<TData, Error, TVariables>,
  maybeOptions?: UseMutationOptions<TData, Error, TVariables>,
) {
  const method = typeof methodOrOptions === "string" ? methodOrOptions : "POST";
  const options = typeof methodOrOptions === "string" ? maybeOptions : methodOrOptions;

  return useMutation({
    mutationFn:
      typeof mutationFnOrEndpoint === "string"
        ? (variables: TVariables) =>
            fetchApi<TData>(mutationFnOrEndpoint, {
              method,
              body: variables ? (variables as Record<string, unknown>) : undefined,
            })
        : mutationFnOrEndpoint,
    ...options,
  });
}

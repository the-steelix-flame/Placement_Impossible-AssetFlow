// Dev B owns this file — placeholder stub until SYNC 1 merge
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

export const queryClient = new QueryClient();

export function useApiQuery<TData>(
  queryKey: string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<TData, Error, TData, string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, Error, TData, string[]>({
    queryKey,
    queryFn: () => fetchApi<TData>(endpoint),
    ...options,
  });
}

export function useApiMutation<TVariables, TData>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) => 
      fetchApi<TData>(endpoint, {
        method,
        body: variables ? JSON.stringify(variables) : undefined,
      }),
    ...options,
  });
}

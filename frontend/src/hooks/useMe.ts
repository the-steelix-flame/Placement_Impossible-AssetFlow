"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Me } from "@/lib/types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return null;
      }

      return api.get<Me>("/me");
    },
    retry: false,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/lib/types";

type MeOut = Employee & { org_id: string };

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<MeOut | null> => {
      try {
        return await api.get<MeOut>("/me");
      } catch {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          return null;
        }

        return {
          id: user.id,
          org_id: "local",
          auth_uid: user.id,
          full_name:
            typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name
              ? user.user_metadata.full_name
              : user.email.split("@")[0],
          email: user.email,
          department_id: null,
          role: "EMPLOYEE",
          status: "ACTIVE",
        };
      }
    },
  });
}

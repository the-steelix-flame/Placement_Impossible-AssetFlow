"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { data: me, isError, isLoading } = useMe();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (checking || !me) {
      return;
    }

    if ((me.access_status ?? "ACTIVE") !== "ACTIVE") {
      router.replace("/pending-approval");
    }
  }, [checking, me, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking || isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <p className="text-base font-semibold">Could not verify your workspace access.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign out and try again after the backend auth bridge is available.
          </p>
          <Button className="mt-5" variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (!me || (me.access_status ?? "ACTIVE") !== "ACTIVE") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import Link from "next/link";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useMe } from "@/hooks/useMe";
import { ACCESS_STATUS, ROLE_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { data: me, isError, isLoading } = useMe();
  const accessStatus = me?.access_status ?? "ACTIVE";

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="grid min-h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load approval status</CardTitle>
          <CardDescription>Try signing in again after the backend is available.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>Use your verified account to view approval status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants({ className: "w-full" })} href="/login">
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (accessStatus === "ACTIVE") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access approved</CardTitle>
          <CardDescription>Your account is active for {me.organization_name ?? "your workspace"}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants({ className: "w-full" })} href="/dashboard">
            Open dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2">
          <StatusBadge config={ACCESS_STATUS[accessStatus]} />
        </div>
        <CardTitle>Waiting for Admin approval</CardTitle>
        <CardDescription>
          {me.organization_name ?? "Your company"} needs to approve your {ROLE_LABELS[me.requested_role ?? me.role]} access
          before company data becomes available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{me.full_name}</p>
          <p className="mt-1 text-muted-foreground">{me.email}</p>
        </div>
        <Button className="w-full" variant="outline" onClick={signOut}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}

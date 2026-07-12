"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clipboard, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { WorkspaceOnboardingResponse } from "@/lib/types";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function CreateCompanyPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<WorkspaceOnboardingResponse | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);

    try {
      const workspace = await api.post<WorkspaceOnboardingResponse>("/onboarding/workspaces", {
        company_name: companyName.trim(),
        admin_full_name: adminFullName.trim(),
        admin_email: adminEmail.trim().toLowerCase(),
      });

      const { data, error: signupError } = await supabase.auth.signUp({
        email: adminEmail.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: adminFullName.trim(),
            signup_ticket: workspace.signup_ticket,
            onboarding_flow: "CREATE_COMPANY",
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setResult(workspace);
      setMessage("Check your email to confirm the Admin account.");
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create company</CardTitle>
        <CardDescription>The first account becomes Admin after email verification.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminFullName">Admin full name</Label>
            <Input
              id="adminFullName"
              value={adminFullName}
              onChange={(event) => setAdminFullName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          {message ? (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              {message}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Creating company" : "Create company"}
          </Button>
        </form>

        {result ? (
          <div className="mt-5 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Clipboard className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Initial role codes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These can be rotated later from Organization.
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {result.role_codes.map((roleCode) => (
                <div key={roleCode.role} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">{ROLE_LABELS[roleCode.role]}</span>
                  <code className="break-all text-sm font-semibold">{roleCode.code}</code>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Need to join a company?{" "}
          <Link className="font-medium text-primary hover:underline" href="/join-company">
            Enter role code
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ROLE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { JoinCodeRole, JoinValidationResponse } from "@/lib/types";

const JOINABLE_ROLES: JoinCodeRole[] = ["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER"];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function JoinCompanyPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<JoinCodeRole>("EMPLOYEE");
  const [roleCode, setRoleCode] = useState("");
  const [validated, setValidated] = useState<JoinValidationResponse | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setValidated(null);

    try {
      const validation = await api.post<JoinValidationResponse>("/onboarding/join/validate-code", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        requested_role: requestedRole,
        role_code: roleCode.trim(),
      });

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            signup_ticket: validation.signup_ticket,
            signup_request_id: validation.signup_request_id,
            onboarding_flow: "JOIN_COMPANY",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/pending-approval`,
        },
      });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace("/pending-approval");
        router.refresh();
        return;
      }

      setValidated(validation);
      setMessage("Code accepted. Check your email to confirm the account.");
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join company</CardTitle>
        <CardDescription>Your role code must match the selected role before verification email is sent.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Requested role</Label>
            <Select value={requestedRole} onValueChange={(value) => value && setRequestedRole(value as JoinCodeRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOINABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleCode">Role code</Label>
            <Input
              id="roleCode"
              value={roleCode}
              onChange={(event) => setRoleCode(event.target.value)}
              placeholder="AF-EMP-..."
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
            {loading ? "Checking code" : "Create account"}
          </Button>
        </form>

        {validated ? (
          <div className="mt-5 rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{validated.organization_name}</p>
            <p className="mt-1 text-muted-foreground">
              Requested role: {ROLE_LABELS[validated.requested_role]}. Access starts only after Admin approval.
            </p>
          </div>
        ) : null}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Creating a new company?{" "}
          <Link className="font-medium text-primary hover:underline" href="/create-company">
            Become Admin
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

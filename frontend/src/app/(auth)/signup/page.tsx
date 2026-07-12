"use client";

import Link from "next/link";
import { Building2, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start a new company workspace or join an existing one with a role code.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link
          className="flex rounded-lg border p-4 transition-colors hover:bg-muted"
          href="/create-company"
        >
          <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <span className="ml-3">
            <span className="block font-medium">Create company</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Set up a workspace and become the first Admin.
            </span>
          </span>
        </Link>
        <Link
          className="flex rounded-lg border p-4 transition-colors hover:bg-muted"
          href="/join-company"
        >
          <LogIn className="mt-0.5 size-5 shrink-0 text-primary" />
          <span className="ml-3">
            <span className="block font-medium">Join company</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Use the exact Employee, Department Head, or Asset Manager code from your Admin.
            </span>
          </span>
        </Link>
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            Sign in
          </Link>
        </p>
        <Link className={buttonVariants({ variant: "outline", className: "w-full" })} href="/login">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

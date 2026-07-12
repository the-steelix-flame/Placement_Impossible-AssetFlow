"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockAssets, mockEmployees } from "@/lib/mock-data";

const screens = [
  { label: "Dashboard", href: "/dashboard", type: "Screen" },
  { label: "Organization", href: "/organization", type: "Screen" },
  { label: "Assets", href: "/assets", type: "Screen" },
  { label: "Allocations", href: "/allocations", type: "Screen" },
  { label: "Bookings", href: "/bookings", type: "Screen" },
  { label: "Maintenance", href: "/maintenance", type: "Screen" },
  { label: "Audits", href: "/audits", type: "Screen" },
  { label: "Reports", href: "/reports", type: "Screen" },
  { label: "Activity", href: "/activity", type: "Screen" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }

      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const results = useMemo(() => {
    const commands = [
      ...screens,
      ...mockAssets.map((asset) => ({ label: `${asset.asset_tag} ${asset.name}`, href: `/assets/${asset.id}`, type: "Asset" })),
      ...mockEmployees.map((employee) => ({ label: employee.full_name, href: "/organization", type: "Employee" })),
    ];
    const normalized = query.trim().toLowerCase();

    return (normalized ? commands.filter((command) => command.label.toLowerCase().includes(normalized)) : commands).slice(0, 9);
  }, [query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 p-4 pt-24">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border bg-card shadow-xl">
        <div className="flex items-center gap-3 border-b p-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="border-0 px-0 focus-visible:ring-0"
          />
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close command palette">
            <X className="size-4" />
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {results.map((result) => (
            <Link
              key={`${result.type}-${result.label}`}
              href={result.href}
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="truncate">{result.label}</span>
              <span className="ml-3 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{result.type}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

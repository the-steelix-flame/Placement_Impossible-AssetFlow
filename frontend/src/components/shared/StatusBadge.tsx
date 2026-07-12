import React from "react";
import { cn } from "@/lib/utils";

// Dev B owns this component. This is a stub for Dev C to build against.
export function StatusBadge({
  config,
}: {
  config: { label: string; color: string; bg: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center">
      <div className="mb-4 rounded-lg bg-muted p-3 text-muted-foreground">
        <FileSearch className="size-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

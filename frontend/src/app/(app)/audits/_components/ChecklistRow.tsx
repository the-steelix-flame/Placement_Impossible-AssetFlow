import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AUDIT_RESULT } from "@/lib/constants";
import { CheckCircle2, HelpCircle, Wrench } from "lucide-react";
import type { AuditItem } from "@/lib/types";
import { useUpdateAuditItem } from "./useAudits";

interface ChecklistRowProps {
  item: AuditItem;
  cycleId: string;
  disabled?: boolean;
}

export function ChecklistRow({ item, cycleId, disabled }: ChecklistRowProps) {
  const updateMutation = useUpdateAuditItem(cycleId);
  const isPending = updateMutation.isPending;

  const setResult = (result: string) => updateMutation.mutate({ id: item.id, result });

  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{item.asset?.name ?? item.asset_id}</p>
        <p className="text-xs text-muted-foreground">{item.asset?.asset_tag}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge config={AUDIT_RESULT[item.result]} />
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          disabled={disabled || isPending}
          onClick={() => setResult("VERIFIED")}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Verified
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          disabled={disabled || isPending}
          onClick={() => setResult("MISSING")}
        >
          <HelpCircle className="h-4 w-4 mr-1" /> Missing
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={disabled || isPending}
          onClick={() => setResult("DAMAGED")}
        >
          <Wrench className="h-4 w-4 mr-1" /> Damaged
        </Button>
      </div>
    </div>
  );
}

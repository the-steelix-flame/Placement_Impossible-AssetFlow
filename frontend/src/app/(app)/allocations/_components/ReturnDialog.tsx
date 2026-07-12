import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetCondition } from "@/lib/types";
import { useReturnAsset } from "./useAllocations";

interface ReturnDialogProps {
  children: React.ReactNode;
  allocationId: string;
}

export function ReturnDialog({ children, allocationId }: ReturnDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [condition, setCondition] = React.useState<AssetCondition>("GOOD");
  const [notes, setNotes] = React.useState("");

  const returnMutation = useReturnAsset();

  const handleSubmit = () => {
    returnMutation.mutate(
      { id: allocationId, return_condition: condition, return_notes: notes || undefined },
      {
        onSuccess: () => {
          setIsOpen(false);
          setNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>
            Record the return of this asset and check its condition.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Return Condition</label>
            <Select value={condition} onValueChange={(value) => value && setCondition(value as AssetCondition)}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="FAIR">Fair</SelectItem>
                <SelectItem value="POOR">Poor</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Return Notes (Optional)</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Any notes about the return or condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={returnMutation.isPending}>
            {returnMutation.isPending ? "Returning..." : "Complete Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllocateAsset } from "./useAllocations";
import { useRequestTransfer } from "./useTransfers";
import { ConflictModal } from "./ConflictModal";
import { ConflictApiError } from "@/lib/api";

export function AllocateDialog({ children }: { children: React.ReactNode }) {
  const [date, setDate] = React.useState<Date>();
  const [assetId, setAssetId] = React.useState("af0114");
  const [assigneeId, setAssigneeId] = React.useState("emp1");
  const [isOpen, setIsOpen] = React.useState(false);
  
  const [conflictData, setConflictData] = React.useState<{ holder: string; holder_id: string } | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = React.useState(false);

  const allocateMutation = useAllocateAsset();
  const requestTransferMutation = useRequestTransfer();

  const handleSubmit = () => {
    // Determine if it's an employee or department ID (simplistic check for mock)
    const isDept = assigneeId.startsWith("dept");
    
    allocateMutation.mutate(
      {
        asset_id: assetId,
        ...(isDept ? { department_id: assigneeId } : { employee_id: assigneeId }),
        expected_return_date: date ? format(date, "yyyy-MM-dd") : undefined,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          // show success toast
        },
        onError: (error) => {
          if (error instanceof ConflictApiError && error.conflictData.holder) {
            setConflictData({
              holder: error.conflictData.holder,
              holder_id: error.conflictData.holder_id || "unknown",
            });
            setIsConflictModalOpen(true);
          } else {
            // show error toast
            console.error(error);
          }
        },
      }
    );
  };

  const handleRequestTransfer = () => {
    setIsConflictModalOpen(false);
    requestTransferMutation.mutate(
      {
        asset_id: assetId,
        reason: "Requested transfer due to conflict during allocation attempt.",
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          // show transfer requested toast
        },
      }
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Allocate Asset</DialogTitle>
          <DialogDescription>
            Assign an asset to an employee or department.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Asset</label>
            <Select value={assetId} onValueChange={(value) => value && setAssetId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="af0114">MacBook Pro M3 (AF-0114)</SelectItem>
                <SelectItem value="af0115">Dell XPS 15 (AF-0115)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Assign To</label>
            <Select value={assigneeId} onValueChange={(value) => value && setAssigneeId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emp1">Priya Sharma (Employee)</SelectItem>
                <SelectItem value="dept1">Engineering (Department)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Expected Return Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={allocateMutation.isPending}>
            {allocateMutation.isPending ? "Allocating..." : "Confirm Allocation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConflictModal 
      isOpen={isConflictModalOpen}
      onClose={() => setIsConflictModalOpen(false)}
      holderName={conflictData?.holder || "Unknown User"}
      onRequestTransfer={handleRequestTransfer}
    />
    </>
  );
}

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
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Department } from "@/lib/types";
import { useCreateAuditCycle } from "./useAudits";

export function CycleWizard({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState<string>("");
  const [location, setLocation] = React.useState("");
  const [startsOn, setStartsOn] = React.useState<Date>();
  const [endsOn, setEndsOn] = React.useState<Date>();

  const { data: departments = [] } = useApiQuery<Department[]>(["departments"], "/departments");
  const createMutation = useCreateAuditCycle();

  const reset = () => {
    setName("");
    setDepartmentId("");
    setLocation("");
    setStartsOn(undefined);
    setEndsOn(undefined);
  };

  const handleSubmit = () => {
    if (!name || !startsOn || !endsOn) return;
    createMutation.mutate(
      {
        name,
        scope_department_id: departmentId || undefined,
        scope_location: location || undefined,
        starts_on: format(startsOn, "yyyy-MM-dd"),
        ends_on: format(endsOn, "yyyy-MM-dd"),
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          reset();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Audit Cycle</DialogTitle>
          <DialogDescription>
            Define the scope and schedule for this verification cycle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Cycle Name</label>
            <Input
              placeholder="e.g. Q3 Engineering Asset Audit"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Scope Department (optional)</label>
            <Select value={departmentId} onValueChange={(value) => setDepartmentId(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Whole organization" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Scope Location (optional)</label>
            <Input
              placeholder="e.g. Building A, Floor 2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !startsOn && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startsOn ? format(startsOn, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startsOn} onSelect={setStartsOn} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !endsOn && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endsOn ? format(endsOn, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endsOn} onSelect={setEndsOn} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !name || !startsOn || !endsOn}
          >
            {createMutation.isPending ? "Creating..." : "Create Cycle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

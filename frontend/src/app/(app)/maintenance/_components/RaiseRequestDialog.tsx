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
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Asset, MaintenancePriority } from "@/lib/types";
import { useCreateMaintenanceRequest } from "./useMaintenance";

export function RaiseRequestDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [assetId, setAssetId] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<MaintenancePriority>("MEDIUM");

  const { data: assets = [] } = useApiQuery<Asset[]>(["assets"], "/assets");
  const createMutation = useCreateMaintenanceRequest();

  const reset = () => {
    setAssetId("");
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
  };

  const handleSubmit = () => {
    if (!assetId || !title) return;
    createMutation.mutate(
      { asset_id: assetId, title, description: description || undefined, priority },
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
          <DialogTitle>Raise Maintenance Request</DialogTitle>
          <DialogDescription>
            Report an issue with an asset that requires maintenance or repair.
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
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} ({asset.asset_tag})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Issue Title</label>
            <Input
              placeholder="e.g. Not heating up"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe the problem in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(value) => value && setPriority(value as MaintenancePriority)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !assetId || !title}
          >
            {createMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

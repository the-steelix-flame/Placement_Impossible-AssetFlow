import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  holderName: string;
  onRequestTransfer: () => void;
}

export function ConflictModal({ isOpen, onClose, holderName, onRequestTransfer }: ConflictModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Asset Already Allocated
          </DialogTitle>
          <DialogDescription className="pt-2">
            This asset is currently held by <strong className="text-foreground">{holderName}</strong>. 
            An asset cannot be double-allocated.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Would you like to formally request a transfer from {holderName}?
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onRequestTransfer}>Request Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface OverlapNoticeProps {
  nextSlot: { starts_at: string; ends_at: string };
  onAcceptSlot: (slot: { starts_at: string; ends_at: string }) => void;
  onCancel: () => void;
}

export function OverlapNotice({ nextSlot, onAcceptSlot, onCancel }: OverlapNoticeProps) {
  const start = new Date(nextSlot.starts_at);
  const end = new Date(nextSlot.ends_at);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3 mt-4">
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-amber-900">Time Slot Unavailable</h4>
        <p className="text-sm text-amber-700 mt-1">
          Your requested time overlaps with an existing confirmed booking. 
          The next available slot is:
        </p>
        <div className="mt-2 font-medium text-amber-900 bg-amber-100/50 inline-block px-2 py-1 rounded">
          {format(start, "MMM d, h:mm a")} - {format(end, "h:mm a")}
        </div>
        <div className="flex gap-2 mt-3">
          <Button 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => onAcceptSlot(nextSlot)}
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Book Next Slot
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

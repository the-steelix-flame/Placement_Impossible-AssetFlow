import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusStepperProps {
  currentStatus: string;
}

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const steps = [
    { id: "PENDING", label: "Pending" },
    { id: "APPROVED", label: "Approved" },
    { id: "ASSIGNED", label: "Assigned" },
    { id: "IN_PROGRESS", label: "In Progress" },
    { id: "RESOLVED", label: "Resolved" }
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStatus) !== -1 
    ? steps.findIndex(s => s.id === currentStatus) 
    : 0; // Default if Cancelled/Rejected

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full"></div>
        
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors border-2",
                  isCompleted ? "bg-primary text-primary-foreground border-primary" : 
                  isCurrent ? "bg-background text-primary border-primary" : 
                  "bg-background text-muted-foreground border-muted"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={cn(
                "text-xs font-medium absolute -bottom-6 w-24 text-center -ml-8",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

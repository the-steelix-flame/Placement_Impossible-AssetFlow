import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MAINTENANCE_STATUS, MAINTENANCE_PRIORITY } from "@/lib/constants";
import { Check, X } from "lucide-react";

interface ApprovalCardProps {
  request: any;
}

export function ApprovalCard({ request }: ApprovalCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{request.title}</CardTitle>
            <CardDescription>{request.asset_name}</CardDescription>
          </div>
          <StatusBadge config={MAINTENANCE_PRIORITY[request.priority as keyof typeof MAINTENANCE_PRIORITY]} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          <p><span className="font-medium text-muted-foreground">Raised by:</span> {request.raised_by}</p>
          <p><span className="font-medium text-muted-foreground">Date:</span> {new Date(request.created_at).toLocaleDateString()}</p>
          <p className="pt-2 text-muted-foreground">{request.description}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2 border-t mt-4">
        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <X className="h-4 w-4 mr-1" /> Reject
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Check className="h-4 w-4 mr-1" /> Approve
        </Button>
      </CardFooter>
    </Card>
  );
}

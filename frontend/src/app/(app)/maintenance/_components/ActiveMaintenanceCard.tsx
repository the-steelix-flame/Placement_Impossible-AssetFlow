import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { MaintenanceRequest } from "@/lib/types";
import { StatusStepper } from "./StatusStepper";
import { useAssignRequest, useStartRequest, useResolveRequest } from "./useMaintenance";

interface ActiveMaintenanceCardProps {
  request: MaintenanceRequest;
}

export function ActiveMaintenanceCard({ request }: ActiveMaintenanceCardProps) {
  const [technicianName, setTechnicianName] = React.useState("");
  const [resolutionNotes, setResolutionNotes] = React.useState("");

  const assignMutation = useAssignRequest();
  const startMutation = useStartRequest();
  const resolveMutation = useResolveRequest();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{request.title}</CardTitle>
        <CardDescription>{request.asset?.name ?? request.asset_id}</CardDescription>
      </CardHeader>
      <CardContent>
        <StatusStepper currentStatus={request.status} />
        {request.technician_name ? (
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium">Technician:</span> {request.technician_name}
          </p>
        ) : null}
      </CardContent>
      {request.status === "APPROVED" ? (
        <CardFooter className="flex items-center gap-2 pt-2 border-t mt-4">
          <Input
            placeholder="Technician name"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
          />
          <Button
            disabled={!technicianName || assignMutation.isPending}
            onClick={() => assignMutation.mutate({ id: request.id, technician_name: technicianName })}
          >
            {assignMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </CardFooter>
      ) : null}
      {request.status === "ASSIGNED" ? (
        <CardFooter className="justify-end pt-2 border-t mt-4">
          <Button disabled={startMutation.isPending} onClick={() => startMutation.mutate({ id: request.id })}>
            {startMutation.isPending ? "Starting..." : "Start Work"}
          </Button>
        </CardFooter>
      ) : null}
      {request.status === "IN_PROGRESS" ? (
        <CardFooter className="flex items-center gap-2 pt-2 border-t mt-4">
          <Input
            placeholder="Resolution notes (optional)"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
          />
          <Button
            disabled={resolveMutation.isPending}
            onClick={() => resolveMutation.mutate({ id: request.id, resolution_notes: resolutionNotes || undefined })}
          >
            {resolveMutation.isPending ? "Resolving..." : "Resolve"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

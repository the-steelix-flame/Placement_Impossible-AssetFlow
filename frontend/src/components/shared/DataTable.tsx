import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Dev B owns this component. This is a stub for Dev C to build against.
export function DataTable({
  columns,
  data,
}: {
  columns: { header: string; accessorKey: string; cell?: (item: any) => React.ReactNode }[];
  data: any[];
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.accessorKey}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={row.id || i}>
                {columns.map((col) => (
                  <TableCell key={col.accessorKey}>
                    {col.cell ? col.cell(row) : row[col.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

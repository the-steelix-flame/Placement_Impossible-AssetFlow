import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DataTableColumn<T extends object> = {
  header: string;
  accessorKey: (keyof T & string) | string;
  cell?: (item: T) => React.ReactNode;
};

export function DataTable<T extends object>({
  columns,
  data,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
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
              <TableRow key={(row as { id?: string }).id || i}>
                {columns.map((col) => (
                  <TableCell key={col.accessorKey}>
                    {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.accessorKey] ?? "")}
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

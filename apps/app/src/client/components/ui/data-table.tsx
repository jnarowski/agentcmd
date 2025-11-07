import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, Row, CellContext } from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/client/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  getRowId?: (row: TData) => string;
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowSelectionChange,
  getRowId,
  renderExpandedRow,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);

      // Call the callback with selected row data
      if (onRowSelectionChange) {
        const selectedRowIndices = Object.keys(newSelection).filter(
          (key) => newSelection[key as keyof typeof newSelection]
        );
        const selectedRowData = selectedRowIndices
          .map((index) => data[parseInt(index)])
          .filter(Boolean);
        onRowSelectionChange(selectedRowData);
      }
    },
    state: {
      rowSelection,
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = row.id;
                const isExpanded = expandedRows[rowId];

                return (
                  <>
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell, cellIndex) => (
                        <TableCell
                          key={cell.id}
                          onClick={() => {
                            // Only toggle expansion if not clicking on the select column (first column)
                            if (cellIndex !== 0) {
                              toggleRowExpansion(rowId);
                            }
                          }}
                          className={cellIndex !== 0 ? 'cursor-pointer' : ''}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            {
                              ...cell.getContext(),
                              // Pass expansion state and toggle function
                              isExpanded,
                              toggleExpansion: () => toggleRowExpansion(rowId),
                            } as CellContext<TData, TValue> & { isExpanded: boolean; toggleExpansion: () => void }
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedRow && (
                      <TableRow key={`${row.id}-expanded`} className="border-0">
                        <TableCell colSpan={columns.length} className="p-0 border-0">
                          {renderExpandedRow(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

export interface AccessibleTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortBy?: keyof T;
  sortDirection?: SortDirection;
  onSort?: (key: keyof T, direction: SortDirection) => void;
  loading?: boolean;
  emptyMessage?: string;
  caption?: string;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
  virtualized?: boolean;
  rowHeight?: number;
  height?: number;
}

function getSortIcon(sortDirection: SortDirection) {
  if (sortDirection === "asc") return <ChevronUp className="h-4 w-4" />;
  if (sortDirection === "desc") return <ChevronDown className="h-4 w-4" />;
  return <ChevronsUpDown className="h-4 w-4" />;
}

function getSortAriaSort(
  sortDirection: SortDirection
): "ascending" | "descending" | "none" {
  if (sortDirection === "asc") return "ascending";
  if (sortDirection === "desc") return "descending";
  return "none";
}

export function AccessibleTable<T>({
  data,
  columns,
  sortBy,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = "No data available",
  caption,
  className,
  rowKey = (row, index) => index,
  virtualized = false,
  rowHeight = 48,
  height = 400,
}: AccessibleTableProps<T>) {
  const handleSort = (columnKey: keyof T) => {
    if (!onSort) return;

    let newDirection: SortDirection = "asc";

    if (sortBy === columnKey) {
      if (sortDirection === "asc") {
        newDirection = "desc";
      } else if (sortDirection === "desc") {
        newDirection = null;
      }
    }

    onSort(columnKey, newDirection);
  };

  const handleKeyDown = (event: React.KeyboardEvent, columnKey: keyof T) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSort(columnKey);
    }
  };

  if (virtualized && !loading && data.length > 0) {
    return (
      <div className={cn("relative", className)}>
        {caption && (
          <div className="text-sm text-muted-foreground mb-4">{caption}</div>
        )}
        {/* Header */}
        <div role="rowgroup" className="sticky top-0 z-10">
          <div role="row" className="flex border-b bg-background">
            {columns.map((column) => (
              <div
                role="columnheader"
                key={String(column.key)}
                className={cn("flex-1 p-2", column.className)}
                aria-sort={
                  sortBy === column.key
                    ? getSortAriaSort(sortDirection || null)
                    : "none"
                }
                tabIndex={column.sortable && onSort ? 0 : undefined}
                onClick={
                  column.sortable && onSort
                    ? () => handleSort(column.key)
                    : undefined
                }
                onKeyDown={
                  column.sortable && onSort
                    ? (e) => handleKeyDown(e, column.key)
                    : undefined
                }
              >
                <span className="flex items-center gap-2">
                  {column.label}
                  {column.sortable &&
                    onSort &&
                    getSortIcon(
                      sortBy === column.key ? sortDirection || null : null
                    )}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Virtualized rows */}
        <div role="rowgroup" style={{ height }} className="overflow-auto">
          <AutoSizer>
            {({ width, height }) => (
              <List
                height={height}
                width={width}
                itemCount={data.length}
                itemSize={rowHeight}
                overscanCount={5}
              >
                {({ index, style }: ListChildComponentProps) => {
                  const row = data[index];
                  return (
                    <div
                      role="row"
                      style={style}
                      className="flex border-b"
                      key={rowKey(row, index)}
                    >
                      {columns.map((column) => (
                        <div
                          role="cell"
                          key={String(column.key)}
                          className={cn("flex-1 p-2", column.className)}
                        >
                          {column.render
                            ? column.render(row[column.key], row)
                            : String(row[column.key] ?? "")}
                        </div>
                      ))}
                    </div>
                  );
                }}
              </List>
            )}
          </AutoSizer>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Table>
        {caption && (
          <caption className="text-sm text-muted-foreground mb-4">
            {caption}
          </caption>
        )}

        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={cn(column.className)}
                aria-sort={
                  sortBy === column.key
                    ? getSortAriaSort(sortDirection || null)
                    : "none"
                }
              >
                {column.sortable && onSort ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort(column.key)}
                    onKeyDown={(e) => handleKeyDown(e, column.key)}
                    aria-label={`Sort by ${column.label}`}
                  >
                    <span className="flex items-center gap-2">
                      {column.label}
                      {getSortIcon(
                        sortBy === column.key ? sortDirection || null : null
                      )}
                    </span>
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={rowKey(row, index)}>
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    className={cn(column.className)}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] ?? "")}
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

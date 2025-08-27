"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showFirstLast = true,
  showPageNumbers = true,
  maxPageNumbers = 5,
  className,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxPageNumbers / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPageNumbers - 1);

    if (end - start + 1 < maxPageNumbers) {
      start = Math.max(1, end - maxPageNumbers + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between px-2", className)}>
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      
      <div className="flex items-center space-x-2">
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {showPageNumbers && (
          <>
            {visiblePages[0] > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  aria-label="Go to page 1"
                >
                  1
                </Button>
                {visiblePages[0] > 2 && (
                  <span className="text-muted-foreground">...</span>
                )}
              </>
            )}

            {visiblePages.map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </Button>
            ))}

            {visiblePages[visiblePages.length - 1] < totalPages && (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                  <span className="text-muted-foreground">...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  aria-label={`Go to page ${totalPages}`}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
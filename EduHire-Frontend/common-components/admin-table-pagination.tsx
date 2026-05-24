'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/common-components/ui/button';

interface AdminTablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export default function AdminTablePagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 20,
}: AdminTablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems ?? page * pageSize);

  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-border-default">
      <p className="text-sm text-text-muted">
        {totalItems != null
          ? `Showing ${from}–${to} of ${totalItems}`
          : `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

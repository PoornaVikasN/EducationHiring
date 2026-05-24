'use client';

import { Download } from 'lucide-react';
import { Button } from '@/common-components/ui/button';

interface AdminExportButtonProps {
  onExport: () => void;
  disabled?: boolean;
  label?: string;
}

export default function AdminExportButton({
  onExport,
  disabled = false,
  label = 'Export CSV',
}: AdminExportButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={disabled} className="gap-2">
      <Download className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}

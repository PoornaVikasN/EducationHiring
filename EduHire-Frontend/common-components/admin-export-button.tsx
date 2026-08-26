'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/common-components/ui/button';

interface AdminExportButtonProps {
  onExport: () => void | Promise<void>;
  disabled?: boolean;
  label?: string;
}

export default function AdminExportButton({
  onExport,
  disabled = false,
  label = 'Export CSV',
}: AdminExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleClick = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={disabled || exporting} className="gap-2">
      <Download className="w-3.5 h-3.5" />
      {exporting ? 'Exporting…' : label}
    </Button>
  );
}

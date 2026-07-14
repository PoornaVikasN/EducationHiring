'use client';

import { UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  accept?: string;
  hint?: string;
  selectedFileName?: string | null;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ accept, hint, selectedFileName, onFileSelected, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
        isDragOver ? 'border-brand-primary bg-brand-primary-light' : 'border-border-default bg-bg-page',
        disabled && 'opacity-50 pointer-events-none',
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <UploadCloud className="w-8 h-8 text-brand-primary mx-auto mb-3" />
      {selectedFileName ? (
        <p className="text-sm font-medium text-text-primary">{selectedFileName}</p>
      ) : (
        <>
          <p className="text-sm font-medium text-text-primary">Drag and drop your file here, or click to browse</p>
          {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
        </>
      )}
    </div>
  );
}

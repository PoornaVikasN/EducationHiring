'use client';

import { CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  accept?: string;
  hint?: string;
  selectedFileName?: string | null;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  /** Show a settled, success-tinted state once the selected file has been validated clean. */
  success?: boolean;
}

export function FileDropzone({ accept, hint, selectedFileName, onFileSelected, disabled, success }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  const settled = !!selectedFileName;

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
        isDragOver
          ? 'border-brand-primary bg-brand-primary-light'
          : success
          ? 'border-green-300 bg-green-50'
          : settled
          ? 'border-brand-primary/40 bg-brand-primary-light'
          : 'border-border-default bg-bg-page hover:border-brand-primary/40',
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
      <div className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3',
        success ? 'bg-green-100' : settled ? 'bg-brand-primary/15' : 'bg-brand-primary-light',
      )}>
        {success
          ? <CheckCircle2 className="w-6 h-6 text-green-600" />
          : settled
          ? <FileSpreadsheet className="w-6 h-6 text-brand-primary" />
          : <UploadCloud className="w-6 h-6 text-brand-primary" />}
      </div>
      {selectedFileName ? (
        <>
          <p className="text-sm font-semibold text-text-primary">{selectedFileName}</p>
          <p className="text-xs text-text-muted mt-1">Click or drop another file to replace it</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-text-primary">Drag and drop your file here, or click to browse</p>
          {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
        </>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';

// Minimal indeterminate progress bar — used for the bulk-import upload step, which is
// processed synchronously in a single request (no chunked progress to report), so an
// honest "working…" animation is used instead of a fabricated percentage.
export function IndeterminateProgressBar({ className }: { className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-bg-page', className)}>
      <div className="h-full w-1/3 rounded-full bg-brand-primary animate-progress-indeterminate" />
    </div>
  );
}

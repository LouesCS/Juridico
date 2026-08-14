import { iconForExtension } from '../domain/file-meta';
import { cn } from '@/lib/utils/cn';

export function FileBadge({ extensao, className }: { extensao: string; className?: string }) {
  const { icon: Icon, colorClass } = iconForExtension(extensao);
  return (
    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md bg-muted', className)}>
      <Icon className={cn('size-5', colorClass)} aria-hidden="true" />
    </div>
  );
}

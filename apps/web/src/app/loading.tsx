import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

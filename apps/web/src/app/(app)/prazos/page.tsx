import type { Metadata } from 'next';
import { DeadlinesPage } from '@/features/deadlines';

export const metadata: Metadata = { title: 'Prazos' };

export default function Page() {
  return <DeadlinesPage />;
}

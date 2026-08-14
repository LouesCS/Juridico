import type { Metadata } from 'next';
import { CollaboratorsPage } from '@/features/team';

export const metadata: Metadata = { title: 'Colaboradores' };

export default function Page() {
  return <CollaboratorsPage />;
}

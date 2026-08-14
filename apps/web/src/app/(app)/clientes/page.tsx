import type { Metadata } from 'next';
import { ClientsPage } from '@/features/clients';

export const metadata: Metadata = { title: 'Clientes' };

export default function Page() {
  return <ClientsPage />;
}

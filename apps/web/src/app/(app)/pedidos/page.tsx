import type { Metadata } from 'next';
import { RequestsPage } from '@/features/requests';

export const metadata: Metadata = { title: 'Pedidos' };

export default function PedidosPage() {
  return <RequestsPage />;
}

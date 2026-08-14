import type { Metadata } from 'next';
import { LegalFolderDetailPage } from '@/features/legal-folders/components/legal-folder-detail-page';
export const metadata: Metadata = { title: 'Pasta Jurídica' };
export default async function PastaDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LegalFolderDetailPage id={id}/>; }

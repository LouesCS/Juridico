import type { Metadata } from 'next';
import { LegalFoldersPage } from '@/features/legal-folders/components/legal-folders-page';
export const metadata: Metadata = { title: 'Pastas' };
export default function PastasPage() { return <LegalFoldersPage />; }

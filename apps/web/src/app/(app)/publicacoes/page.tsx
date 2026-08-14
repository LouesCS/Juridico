import type { Metadata } from 'next';
import { PublicationsPage } from '@/features/publications';
export const metadata:Metadata={title:'Publicações'};
export default function Page(){return <PublicationsPage/>}

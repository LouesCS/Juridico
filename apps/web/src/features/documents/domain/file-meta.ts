import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from 'lucide-react';

/** Ícone + cor por extensão — reafirma Sprint 09 ("Ícone conforme extensão"). Resolvido no cliente, sem depender de um campo novo no backend. */
const ICON_BY_EXTENSION: Record<string, { icon: LucideIcon; colorClass: string }> = {
  pdf: { icon: FileText, colorClass: 'text-red-600 dark:text-red-400' },
  doc: { icon: FileText, colorClass: 'text-blue-600 dark:text-blue-400' },
  docx: { icon: FileText, colorClass: 'text-blue-600 dark:text-blue-400' },
  txt: { icon: FileText, colorClass: 'text-muted-foreground' },
  md: { icon: FileText, colorClass: 'text-muted-foreground' },
  xls: { icon: FileSpreadsheet, colorClass: 'text-emerald-600 dark:text-emerald-400' },
  xlsx: { icon: FileSpreadsheet, colorClass: 'text-emerald-600 dark:text-emerald-400' },
  csv: { icon: FileSpreadsheet, colorClass: 'text-emerald-600 dark:text-emerald-400' },
  ppt: { icon: FileText, colorClass: 'text-orange-600 dark:text-orange-400' },
  pptx: { icon: FileText, colorClass: 'text-orange-600 dark:text-orange-400' },
  jpg: { icon: FileImage, colorClass: 'text-purple-600 dark:text-purple-400' },
  jpeg: { icon: FileImage, colorClass: 'text-purple-600 dark:text-purple-400' },
  png: { icon: FileImage, colorClass: 'text-purple-600 dark:text-purple-400' },
  gif: { icon: FileImage, colorClass: 'text-purple-600 dark:text-purple-400' },
  webp: { icon: FileImage, colorClass: 'text-purple-600 dark:text-purple-400' },
  svg: { icon: FileImage, colorClass: 'text-purple-600 dark:text-purple-400' },
  mp4: { icon: FileVideo, colorClass: 'text-pink-600 dark:text-pink-400' },
  mov: { icon: FileVideo, colorClass: 'text-pink-600 dark:text-pink-400' },
  mp3: { icon: FileAudio, colorClass: 'text-pink-600 dark:text-pink-400' },
  wav: { icon: FileAudio, colorClass: 'text-pink-600 dark:text-pink-400' },
  zip: { icon: FileArchive, colorClass: 'text-amber-600 dark:text-amber-400' },
  rar: { icon: FileArchive, colorClass: 'text-amber-600 dark:text-amber-400' },
  '7z': { icon: FileArchive, colorClass: 'text-amber-600 dark:text-amber-400' },
  json: { icon: FileCode, colorClass: 'text-cyan-600 dark:text-cyan-400' },
  xml: { icon: FileCode, colorClass: 'text-cyan-600 dark:text-cyan-400' },
};

export function iconForExtension(extensao: string): { icon: LucideIcon; colorClass: string } {
  return ICON_BY_EXTENSION[extensao.toLowerCase()] ?? { icon: File, colorClass: 'text-muted-foreground' };
}

const PREVIEWABLE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'txt', 'md']);

export function isPreviewable(extensao: string): boolean {
  return PREVIEWABLE_EXTENSIONS.has(extensao.toLowerCase());
}

export function previewKind(extensao: string): 'pdf' | 'image' | 'text' | 'none' {
  const ext = extensao.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['txt', 'md'].includes(ext)) return 'text';
  return 'none';
}

export function formatBytes(bytes: number | string): string {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

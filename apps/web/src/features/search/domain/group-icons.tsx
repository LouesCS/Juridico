import {
  CalendarClock,
  CheckSquare,
  FileText,
  Folder,
  History,
  MessageSquare,
  Newspaper,
  Scale,
  Tag,
  Users,
  Users2,
  type LucideIcon,
} from 'lucide-react';
import type { SearchResultType } from '../api/search.api';

export const SEARCH_GROUP_ICONS: Record<SearchResultType, LucideIcon> = {
  clients: Users,
  'legal-cases': Scale,
  documents: FileText,
  deadlines: CalendarClock,
  tasks: CheckSquare,
  team: Users2,
  folders: Folder,
  timeline: History,
  tags: Tag,
  comments: MessageSquare,
  publications: Newspaper,
  'judicial-movements': History,
  'extrajudicial-movements': History,
  requests: FileText,
};

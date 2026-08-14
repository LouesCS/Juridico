'use client';

import { useQuery } from '@tanstack/react-query';
import { profileApi } from './profile.api';
import { profileKeys } from './keys';

export function useSessions() {
  return useQuery({
    queryKey: profileKeys.sessions(),
    queryFn: profileApi.listSessions,
  });
}

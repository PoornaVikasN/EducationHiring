import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/api/public';

export type SettingsMap = Record<string, number>;

const FALLBACK: SettingsMap = {
  TEACHER_PAID_ENABLED: 0,
  SCHOOL_PAID_ENABLED: 1,
  FREE_TIER_JOB_LIMIT: 2,
};

export function usePublicSettings(): { settings: SettingsMap; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => publicApi.getSettings().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const settings: SettingsMap = data
    ? Object.fromEntries(data.map((s) => [s.key, s.valueNumber]))
    : FALLBACK;

  return { settings, isLoading };
}

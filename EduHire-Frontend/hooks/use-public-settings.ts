import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/api/public';

export type SettingsMap = Record<string, number>;

// No hardcoded fallback values, ever — every setting comes from the live API response.
// While loading, `settings` is `{}`; callers must check `isLoading` before branching on
// a specific key rather than assuming a default value.
export function usePublicSettings(): { settings: SettingsMap; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => publicApi.getSettings().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const settings: SettingsMap = data
    ? Object.fromEntries(data.map((s) => [s.key, s.valueNumber]))
    : {};

  return { settings, isLoading };
}

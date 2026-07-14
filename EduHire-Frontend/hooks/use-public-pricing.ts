import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/api/public';

export type PricingMap = Record<string, number>;

// No hardcoded fallback amounts, ever — every price comes from the live API response.
// While loading (or if a key genuinely isn't configured yet), `pricing` is `{}` and
// callers must render a loading/placeholder state instead of inventing a number.
export function usePublicPricing(): { pricing: PricingMap; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: () => publicApi.getPricing().then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const pricing: PricingMap = data
    ? Object.fromEntries(data.map((p) => [p.key, p.valueNumber]))
    : {};

  return { pricing, isLoading };
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

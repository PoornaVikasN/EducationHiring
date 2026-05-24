import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/api/public';
import {
  RECRUITER_MONTHLY_PAISE,
  APPLICATION_FEE_PAISE,
} from '../lib/shared/constants';

export type PricingMap = Record<string, number>;

const FALLBACK: PricingMap = {
  RECRUITER_MONTHLY_PAISE,
  APPLICATION_FEE_PAISE,
};

export function usePublicPricing(): { pricing: PricingMap; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: () => publicApi.getPricing().then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const pricing: PricingMap = data
    ? Object.fromEntries(data.map((p) => [p.key, p.valueNumber]))
    : FALLBACK;

  return { pricing, isLoading };
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

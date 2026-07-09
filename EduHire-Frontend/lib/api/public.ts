import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export interface PublicPricingConfig {
  key: string;
  label: string;
  valueNumber: number;
}

export const publicApi = {
  getPricing: () =>
    axios.get<PublicPricingConfig[]>(`${API_BASE_URL}/public/pricing`),
  getSettings: () =>
    axios.get<PublicPricingConfig[]>(`${API_BASE_URL}/public/settings`),
};

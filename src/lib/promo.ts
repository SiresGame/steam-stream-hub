import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const promoPrice = (rate: number, discount = 0) => Math.round(rate * (100 - Math.min(100, Math.max(0, discount))) / 100);
export const normalizePromoCode = (code: string) => code.trim().toUpperCase();
export function useActivePromo() {
  return useQuery({ queryKey: ["active-promo"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.rpc("my_active_promo");
    if (error) throw error;
    return data?.[0] ?? null;
  }, staleTime: 0, refetchInterval: 60000 });
}

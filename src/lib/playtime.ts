import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Возвращает баланс игрока или null, если не вошёл. */
export function useBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        if (alive) setBalance(null);
        return;
      }
      const { data: p } = await supabase.rpc("my_profile");
      if (alive) setBalance(p?.balance ?? 0);
    });
    return () => {
      alive = false;
    };
  }, []);
  return balance;
}

/** Текст «Хватит на …» по балансу и цене за час, null если показывать нечего. */
export function formatPlaytime(balance: number | null, price: number): string | null {
  if (balance == null || balance <= 0 || price <= 0) return null;
  const minutes = Math.floor((balance / price) * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `Хватит на ${m} мин`;
  if (m === 0) return `Хватит на ${h} ч`;
  return `Хватит на ${h} ч ${m} мин`;
}

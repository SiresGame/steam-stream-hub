import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Library, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const errors: Record<string, string> = {
  insufficient_funds: "Недостаточно денег на балансе",
  sold_out: "Аккаунты с этой игрой закончились",
  already_owned: "Эта игра уже в твоей библиотеке",
  user_blocked: "Ваш профиль заблокирован администратором",
};

export function BuyAccount({ gameId, title }: { gameId: string; title: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const offer = useQuery({ queryKey: ["offer", gameId], queryFn: async () => (await supabase.rpc("game_account_offer", { _game_id: gameId })).data?.[0] ?? null });
  const owned = useQuery({ queryKey: ["owned", gameId], queryFn: async () => { const { data: s } = await supabase.auth.getSession(); if (!s.session) return false; const { count } = await supabase.from("game_accounts").select("id", { count: "exact", head: true }).eq("game_id", gameId).eq("sold_to", s.session.user.id); return (count ?? 0) > 0; } });

  if (owned.data) return <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm"><span className="flex items-center gap-2"><Library size={16} className="text-primary" />Игра в твоей библиотеке</span><Link to="/profile" className="font-semibold text-primary">Открыть</Link></div>;
  if (!offer.data?.available) return null;

  async function buy() {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { navigate({ to: "/auth" }); return; }
    if (!confirm(`Купить аккаунт с «${title}» за ${offer.data!.price} ₽? Деньги спишутся с баланса.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("buy_game_account", { _game_id: gameId });
    setBusy(false);
    if (error) { const k = Object.keys(errors).find((e) => error.message.includes(e)); toast.error(k ? errors[k] : "Не удалось купить"); return; }
    toast.success("Готово! Данные аккаунта — в библиотеке профиля");
    qc.invalidateQueries();
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound size={16} className="text-primary" />Купить аккаунт с игрой навсегда</p>
      <p className="mt-1 text-xs text-muted-foreground">Осталось {offer.data.available} шт. Игра останется в твоей библиотеке.</p>
      <Button variant="secondary" className="mt-3 h-11 w-full gap-2" disabled={busy} onClick={buy}><ShoppingBag size={16} />{busy ? "Покупаем…" : `Купить за ${offer.data.price} ₽`}</Button>
    </div>
  );
}

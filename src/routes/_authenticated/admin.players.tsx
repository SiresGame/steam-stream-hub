import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/players")({ component: Players });

const fmt = (d: string) => new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

function Players() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "players"], queryFn: async () => {
    await supabase.rpc("admin_settle_all");
    const [p, s] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("rental_sessions").select("*").order("started_at", { ascending: false }).limit(100),
    ]);
    if (p.error) throw p.error;
    return { players: p.data, sessions: s.data ?? [] };
  } });
  const [amount, setAmount] = useState<Record<string, string>>({});
  const emailOf = (id: string) => data.data?.players.find((p) => p.id === id)?.email ?? id.slice(0, 8);

  async function adjust(id: string, sign: 1 | -1) {
    const n = parseInt(amount[id] ?? "", 10);
    if (!n || n <= 0 || n > 1000000) { toast.error("Введите сумму"); return; }
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: id, _amount: n * sign });
    if (error) { toast.error("Ошибка"); return; }
    toast.success("Баланс обновлён"); setAmount({ ...amount, [id]: "" }); qc.invalidateQueries({ queryKey: ["admin"] });
  }
  async function end(id: string) {
    const { error } = await supabase.rpc("end_rental", { _session_id: id });
    if (error) toast.error("Ошибка"); else qc.invalidateQueries();
  }
  async function block(id: string, blocked: boolean) {
    const { error } = await supabase.rpc("admin_set_blocked", { _user_id: id, _blocked: blocked });
    if (error) { toast.error("Ошибка"); return; }
    if (blocked) { const s = data.data?.sessions.find((x) => x.user_id === id && !x.ended_at); if (s) await supabase.rpc("end_rental", { _session_id: s.id }); }
    toast.success(blocked ? "Игрок заблокирован" : "Игрок разблокирован");
    if (error) toast.error("Ошибка"); else qc.invalidateQueries();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Игроки</h1>
      <p className="text-sm text-muted-foreground">Игрок появляется здесь после первого входа в профиль.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Email</th><th className="p-3">Баланс</th><th className="p-3">Пополнить / списать</th><th className="p-3">Регистрация</th><th className="p-3">Доступ</th></tr></thead>
          <tbody>
            {data.isLoading && <tr><td colSpan={5} className="p-4 text-muted-foreground">Загрузка…</td></tr>}
            {data.data?.players.map((p) => <tr key={p.id} className="border-b border-border last:border-0"><td className="p-3 font-medium">{p.email}</td><td className="p-3">{p.balance} ₽</td><td className="p-3"><div className="flex gap-2"><Input type="number" className="h-9 w-24" placeholder="₽" value={amount[p.id] ?? ""} onChange={(e) => setAmount({ ...amount, [p.id]: e.target.value })} /><Button size="sm" onClick={() => adjust(p.id, 1)}>+</Button><Button size="sm" variant="secondary" onClick={() => adjust(p.id, -1)}>−</Button></div></td><td className="p-3">{fmt(p.created_at)}</td><td className="p-3"><Button size="sm" variant={p.blocked ? "secondary" : "destructive"} onClick={() => block(p.id, !p.blocked)}>{p.blocked ? "Разблокировать" : "Заблокировать"}</Button></td></tr>)}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 text-xl font-bold">Сессии</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Игрок</th><th className="p-3">Компьютер</th><th className="p-3">Начало</th><th className="p-3">Статус</th><th className="p-3">Списано</th><th className="p-3" /></tr></thead>
          <tbody>
            {!data.data?.sessions.length && <tr><td colSpan={6} className="p-4 text-muted-foreground">Сессий нет</td></tr>}
            {data.data?.sessions.map((s) => <tr key={s.id} className="border-b border-border last:border-0"><td className="p-3">{emailOf(s.user_id)}</td><td className="p-3">{s.computer_name}</td><td className="p-3">{fmt(s.started_at)}</td><td className="p-3">{s.ended_at ? `Завершена ${fmt(s.ended_at)}` : <span className="text-primary">Активна</span>}</td><td className="p-3">{s.total_charged} ₽</td><td className="p-3 text-right">{!s.ended_at && <Button size="sm" variant="destructive" onClick={() => end(s.id)}>Завершить</Button>}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

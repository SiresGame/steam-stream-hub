import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/revenue")({ component: Revenue });

const fmt = (d: string) => new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
function duration(a: string, b: string | null) {
  const m = Math.max(0, Math.round(((b ? new Date(b) : new Date()).getTime() - new Date(a).getTime()) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`;
}

function Revenue() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const data = useQuery({ queryKey: ["admin", "revenue"], queryFn: async () => {
    const [s, p, w] = await Promise.all([
      supabase.from("rental_sessions").select("*").order("started_at", { ascending: false }).limit(1000),
      supabase.from("profiles").select("id, email"),
      supabase.from("admin_withdrawals").select("*").order("created_at", { ascending: false }),
    ]);
    if (s.error) throw s.error;
    return { sessions: s.data, players: p.data ?? [], withdrawals: w.data ?? [] };
  } });
  const emailOf = (id: string) => data.data?.players.find((p) => p.id === id)?.email ?? id.slice(0, 8);
  const earned = data.data?.sessions.reduce((a, s) => a + s.total_charged, 0) ?? 0;
  const withdrawn = data.data?.withdrawals.reduce((a, w) => a + w.amount, 0) ?? 0;
  const available = earned - withdrawn;
  const rows = useMemo(() => (data.data?.sessions ?? []).filter((s) => !q || `${emailOf(s.user_id)} ${s.computer_name}`.toLowerCase().includes(q.toLowerCase())), [data.data, q]);

  async function withdraw() {
    const n = parseInt(amount, 10);
    if (!n || n <= 0 || n > available) { toast.error("Неверная сумма"); return; }
    const { error } = await supabase.from("admin_withdrawals").insert({ admin_id: user.id, amount: n, note: note.trim().slice(0, 300) });
    if (error) { toast.error("Ошибка"); return; }
    setAmount(""); setNote(""); toast.success("Вывод записан"); qc.invalidateQueries({ queryKey: ["admin", "revenue"] });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Доходы и вывод</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[["Заработано всего", earned], ["Выведено", withdrawn], ["Доступно к выводу", available]].map(([l, v]) => <div key={l} className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v} ₽</p></div>)}
      </div>
      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Вывести деньги</h2>
        <p className="text-xs text-muted-foreground">Платёжная система не подключена — вывод записывается в журнал, сам перевод делается вручную.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Input type="number" placeholder="Сумма" className="w-32" value={amount} onChange={(e) => setAmount(e.target.value)} /><Input placeholder="Комментарий (карта, счёт)" className="w-64" value={note} onChange={(e) => setNote(e.target.value)} /><Button onClick={withdraw}>Вывести</Button></div>
        {!!data.data?.withdrawals.length && <ul className="mt-3 grid gap-1 text-sm">{data.data.withdrawals.map((w) => <li key={w.id} className="text-muted-foreground">{fmt(w.created_at)} — <b className="text-foreground">{w.amount} ₽</b> {w.note}</li>)}</ul>}
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">История аренд</h2><Input placeholder="Поиск по игроку или ПК" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-muted-foreground"><tr><th className="p-3">Начало</th><th className="p-3">Игрок</th><th className="p-3">ПК</th><th className="p-3">Длительность</th><th className="p-3">Цена/час</th><th className="p-3">Заработано</th></tr></thead>
          <tbody>{rows.map((s) => <tr key={s.id} className="border-t border-border"><td className="p-3">{fmt(s.started_at)}</td><td className="p-3">{emailOf(s.user_id)}</td><td className="p-3">{s.computer_name}</td><td className="p-3">{duration(s.started_at, s.ended_at)}{!s.ended_at && <span className="ml-1 text-primary">· идёт</span>}</td><td className="p-3">{s.price_per_hour} ₽</td><td className="p-3 font-semibold">{s.total_charged} ₽</td></tr>)}</tbody>
        </table>
        {!rows.length && <p className="p-4 text-muted-foreground">Аренд пока нет</p>}
      </div>
    </div>
  );
}

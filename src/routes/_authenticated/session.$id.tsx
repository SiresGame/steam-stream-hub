import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Power, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/session/$id")({
  head: () => ({ meta: [{ title: "Сессия ПК" }, { name: "robots", content: "noindex" }] }),
  component: SessionPage,
});

function SessionPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const profile = useQuery({ queryKey: ["profile"], refetchInterval: 15000, queryFn: async () => { const { data, error } = await supabase.rpc("my_profile"); if (error) throw error; return data; } });
  const session = useQuery({ queryKey: ["session", id, profile.dataUpdatedAt], enabled: !!profile.data, queryFn: async () => (await supabase.from("rental_sessions").select("*").eq("id", id).maybeSingle()).data });
  const url = useQuery({ queryKey: ["session-url", id], queryFn: async () => (await supabase.rpc("session_url", { _session_id: id })).data });

  const s = session.data;
  const paidUntil = s ? new Date(s.paid_until).getTime() : 0;
  const left = Math.max(0, paidUntil - now);
  const cantPay = !!s && !!profile.data && profile.data.balance < s.price_per_hour;
  const cutoff = Math.max(0, left - 60000);
  useEffect(() => { if (s && !s.ended_at && ((cantPay && cutoff === 0) || left === 0)) profile.refetch(); }, [cutoff === 0, left === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function end() {
    if (!confirm("Завершить сессию?")) return;
    const { error } = await supabase.rpc("end_rental", { _session_id: id });
    if (error) toast.error("Не удалось завершить"); else qc.invalidateQueries();
  }
  const t = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  if (!s) return <div className="p-10 text-muted-foreground">Загрузка…</div>;
  if (s.ended_at) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Power size={48} className="text-muted-foreground" />
      <h1 className="text-2xl font-bold">Сессия завершена</h1>
      <p className="text-muted-foreground">{s.computer_name} · списано {s.total_charged} ₽</p>
      <div className="flex gap-2"><Button asChild><Link to="/profile">В профиль</Link></Button><Button asChild variant="ghost"><Link to="/computer">К компьютерам</Link></Button></div>
    </main>
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 text-sm">
        <div className="flex items-center gap-3"><span className="font-semibold">{s.computer_name}</span><span className="text-muted-foreground"><Wallet size={14} className="mr-1 inline" />{profile.data?.balance ?? "…"} ₽</span></div>
        <div className="flex items-center gap-2">
          <span className="font-mono">{cantPay ? `Отключение через ${t(cutoff)}` : `Следующее списание через ${t(left)}`}</span>
          {url.data && <Button asChild size="sm" variant="ghost"><a href={url.data} target="_blank" rel="noopener noreferrer" aria-label="Открыть в новой вкладке"><ExternalLink size={14} /></a></Button>}
          <Button size="sm" variant="destructive" onClick={end}>Завершить</Button>
        </div>
      </header>
      <div className="relative flex-1 bg-muted">
        {url.data ? <iframe src={url.data} title={s.computer_name} className="h-full w-full border-0" allow="fullscreen; gamepad; autoplay; clipboard-read; clipboard-write; microphone; camera" allowFullScreen /> : <p className="p-6 text-muted-foreground">Ссылка недоступна</p>}
        {cantPay && left < 15 * 60000 && (
          <div className="absolute inset-x-3 top-3 mx-auto max-w-lg rounded-xl border border-destructive bg-card p-4 shadow-lg">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} className="text-destructive" />Не хватает денег на следующий час</p>
            <p className="mt-1 text-sm text-muted-foreground">Нужно {s.price_per_hour} ₽, на балансе {profile.data?.balance} ₽. Пополните баланс (обратитесь к администратору), иначе сессия завершится через {t(cutoff)}.</p>
            <Button size="sm" className="mt-3" onClick={() => profile.refetch()}>Я пополнил — проверить</Button>
          </div>
        )}
      </div>
    </div>
  );
}

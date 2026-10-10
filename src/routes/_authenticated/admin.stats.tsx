import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/stats")({ component: Stats });

const pageName = (p: string) => p === "/" ? "Главная" : p.startsWith("/computer/") ? `Игра: ${p.split("/")[2]}` : p.startsWith("/session/") ? "В сессии" : p;

function Stats() {
  const q = useQuery({ queryKey: ["admin", "stats"], refetchInterval: 30000, queryFn: async () => {
    const since = new Date(Date.now() - 3 * 60000).toISOString();
    const [pr, pl, s, g] = await Promise.all([
      supabase.from("site_presence").select("*").gte("last_seen", since).order("last_seen", { ascending: false }),
      supabase.from("profiles").select("id, email"),
      supabase.from("rental_sessions").select("id, user_id, computer_name, started_at").is("ended_at", null),
      supabase.from("games").select("slug, title"),
    ]);
    return { online: pr.data ?? [], players: pl.data ?? [], active: s.data ?? [], games: g.data ?? [] };
  } });
  const d = q.data;
  const email = (id: string | null) => d?.players.find((p) => p.id === id)?.email ?? "—";
  const title = (path: string) => { const slug = path.split("/")[2]; return d?.games.find((g) => g.slug === slug)?.title ?? pageName(path); };
  const users = d?.online.filter((o) => o.user_id) ?? [];
  const guests = d?.online.filter((o) => !o.user_id) ?? [];
  const stats = [
    { label: "Сейчас на сайте", value: d?.online.length ?? 0 },
    { label: "Пользователи", value: users.length },
    { label: "Гости", value: guests.length },
    { label: "Играют сейчас", value: d?.active.length ?? 0 },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold">Статистика онлайн</h1>
      <p className="text-sm text-muted-foreground">Онлайн — кто был активен за последние 3 минуты. Обновляется каждые 30 секунд.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map((s) => <div key={s.label} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{s.label}</p><p className="mt-2 text-3xl font-bold">{s.value}</p></div>)}</div>
      <h2 className="mt-8 text-lg font-semibold">Играют сейчас</h2>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
        {!d?.active.length && <li className="px-4 py-3 text-sm text-muted-foreground">Никто не играет</li>}
        {d?.active.map((s) => { const o = d.online.find((x) => x.user_id === s.user_id); return <li key={s.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span>{email(s.user_id)}</span><span>{s.computer_name}</span><span className="text-muted-foreground">{o ? title(o.path) : "не в сети"}</span></li>; })}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">Кто на сайте</h2>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
        {!d?.online.length && <li className="px-4 py-3 text-sm text-muted-foreground">Никого нет</li>}
        {d?.online.map((o) => <li key={o.visitor_id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span>{o.user_id ? email(o.user_id) : <span className="text-muted-foreground">Гость</span>}</span><span>{title(o.path)}</span></li>)}
      </ul>
    </div>
  );
}

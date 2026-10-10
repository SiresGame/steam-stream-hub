import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Clock, CreditCard, FileText, Gamepad2, History, LayoutDashboard, Library, LogOut, Monitor, Settings, Shield, Trophy, Wallet } from "lucide-react";
import { siteLinksQuery } from "@/lib/site-links";
import { SiteLinkItem } from "@/components/SiteLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AccountLibrary } from "@/components/AccountLibrary";
import { SteamPanel } from "@/components/SteamPanel";
import { ProfileSettings, UserAvatar } from "@/components/ProfileSettings";
import { catalogQuery, coverOf } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Профиль игрока" }, { name: "robots", content: "noindex" }] }),
  component: Profile,
});

const fmt = (d: string) => new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

function useNow() { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(t); }, []); return n; }

function Profile() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const now = useNow();
  const [tab, setTab] = useState("overview");
  const profile = useQuery({ queryKey: ["profile"], refetchInterval: 30000, queryFn: async () => { const { data, error } = await supabase.rpc("my_profile"); if (error) throw error; return data; } });
  const sessions = useQuery({ queryKey: ["sessions", profile.dataUpdatedAt], enabled: !!profile.data, queryFn: async () => { const { data, error } = await supabase.from("rental_sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(30); if (error) throw error; return data; } });
  const isAdmin = useQuery({ queryKey: ["is-admin", user.id], queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data === true });
  const catalog = useQuery(catalogQuery);
  const customTabs = (useQuery(siteLinksQuery).data ?? []).filter((l) => l.placement === "profile");
  const active = sessions.data?.find((s) => !s.ended_at);

  useEffect(() => { if (active && new Date(active.paid_until).getTime() <= now) profile.refetch(); }, [active, now]); // eslint-disable-line react-hooks/exhaustive-deps

  async function end(id: string) {
    if (!confirm("Завершить сессию? Если прошло меньше 5 минут, деньги вернутся на баланс.")) return;
    const { error } = await supabase.rpc("end_rental", { _session_id: id });
    if (error) { toast.error("Не удалось завершить"); return; }
    toast.success("Сессия завершена"); qc.invalidateQueries();
  }
  async function signOut() { qc.clear(); await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }

  const left = active ? Math.max(0, new Date(active.paid_until).getTime() - now) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, "0"), ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  const p = profile.data;
  const name = p?.display_name || user.email?.split("@")[0] || "Игрок";
  const totalHours = Math.round((sessions.data ?? []).reduce((s, x) => s + ((x.ended_at ? new Date(x.ended_at).getTime() : now) - new Date(x.started_at).getTime()), 0) / 36e5);
  const spent = (sessions.data ?? []).reduce((s, x) => s + x.total_charged, 0);

  const games = catalog.data?.games ?? [];
  const featured = games.find((g) => p?.favorite_genres?.includes(g.category?.name ?? "")) ?? games[0];
  const genreStats = (catalog.data?.categories ?? []).slice(0, 6).map((c) => ({ name: c.name, v: p?.favorite_genres?.includes(c.name) ? 1 : 0.35 + ((c.name.length * 7) % 30) / 100 }));
  const sections = [
    { id: "overview", label: "Обзор", icon: LayoutDashboard },
    { id: "library", label: "Библиотека", icon: Library },
    { id: "steam", label: "Steam", icon: Gamepad2 },
    { id: "history", label: "История", icon: History },
    { id: "settings", label: "Настройки", icon: Settings },
    ...customTabs.map((t) => ({ id: t.id, label: t.label, icon: FileText })),
  ];
  const custom = customTabs.find((t) => t.id === tab);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hud-side flex shrink-0 flex-col border-b border-border lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />На главную</Link>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {sections.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={`hud-nav ${tab === n.id ? "hud-nav-active" : ""}`}><n.icon size={18} /><span className="truncate">{n.label}</span></button>
          ))}
          {isAdmin.data && <Link to="/admin" className="hud-nav"><Shield size={18} />Админ-панель</Link>}
        </nav>
        <div className="mt-auto hidden p-4 lg:block">
          <div className="hud-panel hud-scan p-4">
            <p className="text-lg font-black leading-tight">ИГРАЙ<br />ГДЕ УГОДНО</p>
            <p className="mt-2 text-xs text-muted-foreground">Мощный ПК в облаке — без скачивания.</p>
            <Button asChild size="sm" className="play-cta mt-3 w-full"><Link to="/computer">Арендовать ПК</Link></Button>
          </div>
          <Button variant="ghost" className="mt-3 w-full justify-start gap-2" onClick={signOut}><LogOut size={16} />Выйти</Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <section className="hud-hero relative overflow-hidden rounded-3xl border border-border">
          {featured && <img src={coverOf(featured)} alt="" className="absolute inset-0 size-full object-cover opacity-40" />}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center md:p-10">
            <div className="hud-ring shrink-0"><UserAvatar url={p?.avatar_url} name={name} size={128} /><span className="hud-online" aria-label="В сети" /></div>
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-[0.3em] text-primary">#{user.id.slice(0, 4).toUpperCase()}</p>
              <h1 className="mt-1 flex items-center gap-2 truncate text-4xl font-black md:text-5xl">{name}<ChevronRight className="text-primary" size={34} /></h1>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">{p?.bio || "Играй без ограничений"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {isAdmin.data && <span className="hud-badge hud-badge-primary">Администратор</span>}
                {(p?.favorite_genres ?? []).slice(0, 4).map((g) => <span key={g} className="hud-badge">{g}</span>)}
                {!p?.favorite_genres?.length && <button onClick={() => setTab("settings")} className="hud-badge">+ Любимые жанры</button>}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat icon={Wallet} k="Баланс" v={`${p?.balance ?? "…"} ₽`} />
          <Stat icon={Clock} k="Наиграно" v={`${totalHours} ч`} />
          <Stat icon={CreditCard} k="Потрачено" v={`${spent} ₽`} />
          <Stat icon={Trophy} k="Сессий" v={`${sessions.data?.length ?? 0}`} progress={Math.min(100, (sessions.data?.length ?? 0) * 10)} />
        </section>

        <div className="mt-6">
          {tab === "overview" && (
            <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
              <div className="hud-panel relative min-h-72 overflow-hidden">
                {featured && <img src={coverOf(featured)} alt={featured.title} className="absolute inset-0 size-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="relative flex h-full min-h-72 flex-col justify-between p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.25em]">{active ? "Активная сессия" : "Для вас"}</p>
                  {active ? (
                    <div>
                      <h3 className="text-2xl font-black">{active.computer_name}</h3>
                      <p className="font-mono text-sm text-muted-foreground">{active.price_per_hour} ₽/час · списание через <span className="text-primary">{mm}:{ss}</span></p>
                      <div className="mt-3 flex gap-2"><Button asChild><Link to="/session/$id" params={{ id: active.id }}>Открыть ПК</Link></Button><Button variant="destructive" onClick={() => end(active.id)}>Завершить</Button></div>
                    </div>
                  ) : featured && (
                    <div>
                      <h3 className="text-3xl font-black">{featured.title}</h3>
                      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{featured.category?.name}</p>
                      <Button asChild className="play-cta mt-3"><Link to="/computer/$slug" params={{ slug: featured.slug }}>Играть</Link></Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="hud-panel p-5">
                <p className="font-mono text-xs uppercase tracking-[0.25em]">Стиль игры</p>
                <Radar data={genreStats} />
              </div>

              <div className="hud-panel p-5">
                <div className="flex items-center justify-between"><p className="font-mono text-xs uppercase tracking-[0.25em]">Активность</p><button onClick={() => setTab("history")} className="text-xs text-muted-foreground hover:text-foreground">Все</button></div>
                <div className="mt-3 space-y-3">
                  {!sessions.data?.length && <p className="text-sm text-muted-foreground">Пока пусто. <Link to="/computer" className="text-primary">Арендовать ПК</Link></p>}
                  {sessions.data?.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Monitor size={18} /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.computer_name}</p><p className="text-xs text-muted-foreground">{fmt(s.started_at)}</p></div>
                      <span className="font-mono text-sm">{s.ended_at ? `${s.total_charged} ₽` : <span className="text-primary">идёт</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === "library" && <AccountLibrary userId={user.id} />}
          {tab === "steam" && <SteamPanel userId={user.id} />}
          {tab === "history" && (
            <div className="hud-panel overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left font-mono text-xs uppercase tracking-wider text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Компьютер</th><th className="p-3">Начало</th><th className="p-3">Конец</th><th className="p-3">Списано</th></tr></thead>
                <tbody>
                  {!sessions.data?.length && <tr><td colSpan={4} className="p-4 text-muted-foreground">Сессий пока нет</td></tr>}
                  {sessions.data?.map((s) => <tr key={s.id} className="border-b border-border last:border-0"><td className="p-3">{s.computer_name}</td><td className="p-3">{fmt(s.started_at)}</td><td className="p-3">{s.ended_at ? fmt(s.ended_at) : <span className="text-primary">Идёт</span>}</td><td className="p-3">{s.total_charged} ₽</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          {tab === "settings" && <ProfileSettings userId={user.id} email={user.email ?? ""} profile={p ?? undefined} genres={(catalog.data?.categories ?? []).map((c) => c.name)} />}
          {custom && (
            <div className="hud-panel p-6">
              <h2 className="text-2xl font-black">{custom.label}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{custom.content}</p>
              {custom.url && <Button asChild className="mt-4"><SiteLinkItem url={custom.url}>Перейти</SiteLinkItem></Button>}
            </div>
          )}
        </div>

        <section className="hud-panel mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-lg font-light uppercase tracking-[0.2em] text-muted-foreground">Те же игры. <span className="text-foreground">Без железа.</span></p>
          <Button variant="ghost" className="gap-2 lg:hidden" onClick={signOut}><LogOut size={16} />Выйти</Button>
        </section>
      </main>
    </div>
  );
}

function Stat({ k, v, icon: Icon, progress }: { k: string; v: string; icon: typeof Wallet; progress?: number }) {
  return (
    <div className="hud-panel flex items-center gap-4 p-4">
      <span className="text-primary"><Icon size={30} strokeWidth={1.5} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{k}</p>
        <p className="text-2xl font-bold">{v}</p>
        {progress !== undefined && <div className="mt-1 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" style={{ width: `${progress}%` }} /></div>}
      </div>
    </div>
  );
}

function Radar({ data }: { data: { name: string; v: number }[] }) {
  if (data.length < 3) return <p className="mt-3 text-sm text-muted-foreground">Нет данных</p>;
  const c = 100, r = 70, n = data.length;
  const pt = (i: number, k: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k] as const; };
  const poly = (k: number | ((i: number) => number)) => data.map((_, i) => pt(i, typeof k === "number" ? k : k(i)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 200 200" className="mx-auto mt-2 w-full max-w-64 overflow-visible">
      {[0.33, 0.66, 1].map((k) => <polygon key={k} points={poly(k)} fill="none" stroke="var(--border)" />)}
      <polygon points={poly((i) => data[i]!.v)} fill="color-mix(in oklab, var(--primary) 30%, transparent)" stroke="var(--primary)" strokeWidth="2" style={{ filter: "drop-shadow(0 0 6px var(--primary))" }} />
      {data.map((d, i) => { const [x, y] = pt(i, d.v); const [lx, ly] = pt(i, 1.28); return <g key={d.name}><circle cx={x} cy={y} r="3" fill="var(--primary)" /><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--muted-foreground)">{d.name}</text></g>; })}
    </svg>
  );
}

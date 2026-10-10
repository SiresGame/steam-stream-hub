import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gamepad2, Link2, Sparkles, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startSteamLink } from "@/lib/steam-link.functions";
import { catalogQuery, coverOf } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

const norm = (s: string) => s.toLowerCase().replace(/[™®©]/g, "").replace(/[^a-zа-я0-9]+/g, " ").trim();
const msgs: Record<string, [string, boolean]> = { ok: ["Steam привязан", true], expired: ["Ссылка устарела, попробуй ещё раз", false], invalid: ["Steam не подтвердил вход", false] };

export function SteamPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const start = useServerFn(startSteamLink);
  const [busy, setBusy] = useState(false);
  const link = useQuery({ queryKey: ["steam-link", userId], queryFn: async () => (await supabase.from("steam_links").select("*").eq("user_id", userId).maybeSingle()).data });
  const catalog = useQuery(catalogQuery);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("steam");
    if (!p) return;
    const m = msgs[p]; if (m) (m[1] ? toast.success : toast.error)(m[0]);
    window.history.replaceState(null, "", window.location.pathname);
    qc.invalidateQueries({ queryKey: ["steam-link"] });
  }, [qc]);

  async function connect() {
    setBusy(true);
    try { const { url } = await start({ data: { origin: window.location.origin } }); window.location.href = url; }
    catch { toast.error("Не удалось открыть Steam"); setBusy(false); }
  }
  async function unlink() {
    if (!confirm("Отвязать Steam?")) return;
    await supabase.from("steam_links").delete().eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["steam-link"] });
  }

  const l = link.data;
  const games = (Array.isArray(l?.games) ? l!.games : []) as { appid: number; name: string; hours: number }[];
  const all = catalog.data?.games ?? [];
  const byTitle = new Map(all.map((g) => [norm(g.title), g]));
  const owned = new Set(games.map((g) => norm(g.name)));
  const picks = all.filter((g) => g.category && (l?.top_genres ?? []).includes(g.category.name) && !owned.has(norm(g.title))).slice(0, 8);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Gamepad2 size={20} className="text-primary" />Steam</h2>
        {l ? <Button variant="ghost" size="sm" className="gap-2" onClick={unlink}><Unlink size={14} />Отвязать</Button> : null}
      </div>

      {!l ? (
        <div className="mt-3 flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Привяжи Steam: твои игры появятся в библиотеке, а мы подберём игры по твоим интересам.</p>
          <Button disabled={busy} onClick={connect} className="gap-2"><Link2 size={16} />{busy ? "Открываем Steam…" : "Привязать Steam"}</Button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            {l.avatar_url && <img src={l.avatar_url} alt="" className="size-12 rounded-xl" />}
            <div>
              <p className="font-semibold">{l.persona || `Steam ${l.steam_id}`}</p>
              <p className="text-xs text-muted-foreground">{games.length ? `${games.length} игр в Steam` : "Список игр скрыт или недоступен"}{l.top_genres?.length ? ` · любимые жанры: ${l.top_genres.join(", ")}` : ""}</p>
            </div>
          </div>

          {picks.length > 0 && (
            <>
              <h3 className="mt-6 flex items-center gap-2 font-bold"><Sparkles size={16} className="text-primary" />Подборка по твоим интересам</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {picks.map((g) => (
                  <Link key={g.id} to="/computer/$slug" params={{ slug: g.slug }} className="overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary">
                    <img src={coverOf(g)} alt={g.title} className="aspect-[460/215] w-full object-cover" />
                    <p className="truncate p-2 text-sm font-semibold">{g.title}</p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {games.length > 0 && (
            <>
              <h3 className="mt-6 font-bold">Игры из Steam в библиотеке</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {games.slice(0, 40).map((g) => {
                  const here = byTitle.get(norm(g.name));
                  return (
                    <div key={g.appid} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
                      <img src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_184x69.jpg`} alt="" className="h-10 w-[86px] rounded object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{g.name}</p><p className="text-xs text-muted-foreground">{g.hours} ч</p></div>
                      {here && <Button asChild size="sm" variant="secondary"><Link to="/computer/$slug" params={{ slug: here.slug }}>Играть</Link></Button>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

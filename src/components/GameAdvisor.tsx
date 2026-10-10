import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recommendGames, type GameRecommendation } from "@/lib/recommend.functions";
import { coverOf } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function GameAdvisor({ genres }: { genres: { name: string; slug: string }[] }) {
  const navigate = useNavigate();
  const run = useServerFn(recommendGames);
  const [picked, setPicked] = useState<string[]>([]);
  const [favorites, setFavorites] = useState("");
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ summary: string; balance: number; items: GameRecommendation[] } | null>(null);
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  async function ask() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try { setRes(await run({ data: { genres: picked, favorites, hours } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
    finally { setBusy(false); }
  }

  return (
    <section className="relative mt-12 overflow-hidden rounded-3xl border border-border bg-card p-6">
      <div className="launch-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative">
        <h2 className="flex items-center gap-2 text-2xl font-bold"><Wand2 className="text-primary" size={22} />Персональные рекомендации</h2>
        <p className="mt-1 text-sm text-muted-foreground">Расскажи, что любишь, — AI подберёт игры из каталога и объяснит выбор.</p>

        <p className="mt-5 text-sm font-semibold">Любимые жанры</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {genres.map((g) => (
            <button key={g.slug} onClick={() => toggle(g.name)} className={`rounded-full border px-4 py-1.5 text-sm transition ${picked.includes(g.name) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"}`}>{g.name}</button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Любимые игры</p>
            <Input className="mt-2" maxLength={300} value={favorites} onChange={(e) => setFavorites(e.target.value)} placeholder="Например: Ведьмак 3, Hades, CS2" />
          </div>
          <div>
            <p className="flex items-center justify-between text-sm font-semibold"><span className="flex items-center gap-2"><Clock size={15} />Длительность сессии</span><span className="tabular-nums">{hours} ч</span></p>
            <Slider className="mt-4" min={1} max={12} step={1} value={[hours]} onValueChange={(v) => setHours(v[0] ?? 1)} />
          </div>
        </div>

        <Button className="mt-5 gap-2" disabled={busy || (!picked.length && favorites.trim().length < 2)} onClick={ask}><Sparkles size={16} />{busy ? "Подбираем…" : "Подобрать игры"}</Button>

        {res && (
          <div className="mt-6">
            {res.summary && <p className="text-sm">{res.summary}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Твой баланс: {res.balance} ₽</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {res.items.map((g, i) => (
                <Link key={g.id} to="/computer/$slug" params={{ slug: g.slug }} style={{ animationDelay: `${i * 80}ms` }} className="fade-up group overflow-hidden rounded-2xl border border-border bg-background/60 transition hover:-translate-y-1 hover:border-primary/60">
                  <img src={coverOf(g)} alt={g.title} loading="lazy" className="aspect-[2.1] w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary">{g.title}</h3>
                    <p className="text-xs text-muted-foreground">{hours} ч ≈ {g.total} ₽{g.discount_percent > 0 && <span className="ml-1 font-semibold text-primary">−{g.discount_percent}%</span>}{g.total > res.balance && " · не хватает баланса"}</p>
                    <p className="mt-2 text-sm">{g.reason}</p>
                  </div>
                </Link>
              ))}
            </div>
            {!res.items.length && <p className="mt-3 text-sm text-muted-foreground">Ничего не нашлось — попробуй другие жанры.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

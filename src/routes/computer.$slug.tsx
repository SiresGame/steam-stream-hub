import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ComputerList } from "@/components/ComputerList";
import { listGameComputers } from "@/lib/catalog.functions";
import { ArrowLeft, Calendar, Cloud, Code2, Cpu, Gauge, Monitor, Play, Sparkles, Tag, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { catalogQuery, coverOf, effectivePrice, gameQuery } from "@/lib/catalog";
import { GameCard } from "@/components/GameCard";
import { BuyAccount } from "@/components/BuyAccount";
import { formatPlaytime, useBalance } from "@/lib/playtime";
import { promoPrice, useActivePromo } from "@/lib/promo";

export const Route = createFileRoute("/computer/$slug")({
  loader: async ({ context, params }) => { const game = await context.queryClient.ensureQueryData(gameQuery(params.slug)); if (!game) throw notFound(); return { title: game.title, about: game.about, image: game.image_url }; },
  head: ({ loaderData }) => loaderData ? { meta: [
    { title: `${loaderData.title} — играть в облаке` },
    { name: "description", content: loaderData.about },
    { property: "og:title", content: `${loaderData.title} — играть в облаке` },
    { property: "og:description", content: loaderData.about },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(loaderData.image?.startsWith("https://") ? [{ property: "og:image", content: loaderData.image }, { name: "twitter:image", content: loaderData.image }] : []),
  ] } : { meta: [{ title: "Игра не найдена" }, { name: "robots", content: "noindex" }] },
  notFoundComponent: () => <main className="p-10 text-center"><h1 className="text-xl font-bold">Игра не найдена</h1><Link to="/computer" className="mt-4 inline-block underline">В каталог</Link></main>,
  errorComponent: () => <main className="p-10 text-center">Не удалось загрузить игру</main>,
  component: GamePage,
});

const presets = [
  { id: "ultra", name: "Ультра", res: "4K", fps: 120, icon: Sparkles },
  { id: "high", name: "Высокие", res: "1440p", fps: 144, icon: Gauge },
  { id: "comp", name: "Киберспорт", res: "1080p", fps: 240, icon: Zap },
];

function GamePage() {
  const { slug } = Route.useParams();
  const { data: game } = useSuspenseQuery(gameQuery(slug));
  const balance = useBalance();
  const activePromo = useActivePromo();
  const rate = game ? promoPrice(effectivePrice(game), activePromo.data?.discount_percent) : 0;
  const playtime = formatPlaytime(balance, rate);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(3);
  const [preset, setPreset] = useState("high");
  const coverRef = useRef<HTMLDivElement>(null);
  const pcs = useQuery({ queryKey: ["game-pcs", game?.id], enabled: open && !!game, queryFn: () => listGameComputers({ data: { gameId: game!.id } }) });
  const catalog = useQuery(catalogQuery);
  if (!game) return null;
  const others = (catalog.data?.games ?? []).filter((g) => g.id !== game.id);
  const same = others.filter((g) => g.category?.slug && g.category.slug === game.category?.slug);
  const recs = [...same, ...others.filter((g) => !same.includes(g))].slice(0, 8);
  const cover = coverOf(game);
  const p = presets.find((x) => x.id === preset)!;

  const tilt = (e: React.PointerEvent) => {
    const el = coverRef.current; if (!el) return;
    const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`); el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
    el.style.setProperty("--mx", `${x * 100}%`); el.style.setProperty("--my", `${y * 100}%`);
  };
  const reset = () => { const el = coverRef.current; el?.style.setProperty("--rx", "0deg"); el?.style.setProperty("--ry", "0deg"); };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
        <img src={cover} alt="" className="game-backdrop h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="launch-grid absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link to="/computer" className="inline-flex items-center gap-2 rounded-full bg-card/60 px-4 py-2 text-sm backdrop-blur transition hover:bg-card"><ArrowLeft size={16} /> Каталог игр</Link>
        {activePromo.data && <p className="mt-4 text-brand-blue">Промокод {activePromo.data.code}: −{activePromo.data.discount_percent}% на все часы следующей сессии</p>}

        <div className="mt-8 grid items-start gap-10 md:grid-cols-[1.3fr_1fr]">
          <div className="fade-up">
            <div ref={coverRef} onPointerMove={tilt} onPointerLeave={reset} className="fx-card game-card relative aspect-[1.9] overflow-hidden shadow-2xl">
              <div className="fx-glow" aria-hidden />
              <img src={cover} alt={game.title} className="h-full w-full object-cover" />
              <div className="fx-glare" aria-hidden />
              <div className="absolute left-4 top-4 flex gap-2">
                {game.label && <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"><Sparkles size={12} />{game.label}</span>}
                <span className="flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold backdrop-blur"><span className="size-2 animate-pulse rounded-full bg-primary" />Готово к запуску</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Tag, k: "Жанр", v: game.category?.name ?? "—" },
                { icon: Code2, k: "Студия", v: game.developer || "—" },
                { icon: Calendar, k: "Год", v: game.year ?? "—" },
                { icon: Cloud, k: "Сохранения", v: game.cloud_saves ? "В облаке" : "Локально" },
              ].map(({ icon: I, k, v }, i) => (
                <div key={k} style={{ animationDelay: `${120 + i * 80}ms` }} className="fade-up group rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:-translate-y-1 hover:border-primary/60">
                  <I size={18} className="text-primary transition group-hover:scale-125" />
                  <p className="mt-2 text-xs text-muted-foreground">{k}</p>
                  <p className="truncate text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>

            <section className="mt-8">
              <h2 className="text-lg font-bold">Об игре</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{game.about}</p>
            </section>

            {(game.requirements_min && game.requirements_min !== "—") && (
              <section className="mt-8">
                <h2 className="text-lg font-bold">Системные требования</h2>
                <p className="mt-1 text-sm text-muted-foreground">Тебе не нужен мощный ПК — игра запускается на нашем компьютере.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[["Минимальные", game.requirements_min], ["Рекомендуемые", game.requirements_rec]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-border/60 bg-card/60 p-4">
                      <p className="text-sm font-semibold text-primary">{k}</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {v!.split("\n").map((l, i) => { const [a, ...b] = l.split(":"); return <li key={i}><span className="text-muted-foreground">{a}:</span> {b.join(":").trim()}</li>; })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-lg font-bold">Выбери качество графики</h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {presets.map(({ id, name, res, fps, icon: I }) => (
                  <button key={id} onClick={() => setPreset(id)} className={`rounded-2xl border p-4 text-left transition ${preset === id ? "border-primary bg-primary/15 shadow-[0_0_30px_-8px_var(--primary)]" : "border-border/60 bg-card/50 hover:border-primary/40"}`}>
                    <I size={18} className={preset === id ? "text-primary" : "text-muted-foreground"} />
                    <p className="mt-2 font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{res} · до {fps} FPS</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-4">
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Gauge size={16} className="text-primary" /> Ожидаемый FPS</span><span className="font-bold tabular-nums">{p.fps}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(p.fps / 240) * 100}%` }} /></div>
                <div className="mt-4 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Wifi size={16} className="text-primary" /> Задержка</span><span className="font-bold tabular-nums">~{p.id === "comp" ? 8 : p.id === "high" ? 12 : 16} мс</span></div>
              </div>
            </section>
          </div>

          {/* sticky buy panel */}
          <aside className="fade-up md:sticky md:top-6" style={{ animationDelay: "150ms" }}>
            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-xl">
              <h1 className="text-3xl font-black leading-tight md:text-4xl">{game.title}</h1>
              {game.developer && <p className="mt-1 text-sm text-muted-foreground">{game.developer}{game.year ? ` · ${game.year}` : ""}</p>}

              <div className="mt-6 flex flex-wrap items-end gap-2"><span className="text-4xl font-black text-primary">{rate} ₽</span><span className="pb-1 text-muted-foreground">/ час</span>{game.discount_percent > 0 && <><span className="pb-1 text-muted-foreground line-through">{game.price} ₽</span><span className="mb-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">−{game.discount_percent}%</span></>}</div>
              {playtime && <p className="mt-1 text-sm text-primary">{playtime}</p>}

              <div className="mt-6 rounded-2xl bg-muted/40 p-4">
                <div className="flex justify-between text-sm"><span>Сколько будешь играть?</span><span className="font-bold tabular-nums">{hours} ч</span></div>
                <Slider className="mt-4" min={1} max={12} step={1} value={[hours]} onValueChange={(v) => setHours(v[0] ?? 1)} />
                <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">Итого</span><span className="text-xl font-bold tabular-nums">{hours * rate} ₽</span></div>
                <p className="mt-2 text-xs text-muted-foreground">Сумма спишется с баланса сразу при запуске{balance != null && balance < hours * rate ? " — сейчас на балансе не хватает" : ""}</p>
              </div>

              <Button className="play-cta mt-6 h-14 w-full gap-2 text-lg font-bold" onClick={() => setOpen(true)}><Play size={20} fill="currentColor" /> Играть сейчас</Button>

              <BuyAccount gameId={game.id} title={game.title} />

              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-3"><Monitor size={16} className="text-primary" /> Не нужен мощный компьютер</li>
                <li className="flex items-center gap-3"><Cpu size={16} className="text-primary" /> Топовые видеокарты RTX</li>
                <li className="flex items-center gap-3"><Zap size={16} className="text-primary" /> Запуск за пару минут</li>
              </ul>
            </div>
          </aside>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader><DialogTitle>Компьютеры с {game.title} · {hours} ч за {hours * rate} ₽</DialogTitle></DialogHeader>
            {pcs.isLoading ? <p className="text-muted-foreground">Загрузка…</p> : pcs.data?.length ? <div className="-mt-12"><ComputerList computers={pcs.data} prepaid={{ gameId: game.id, hours, total: hours * rate }} /></div> : <p className="text-muted-foreground">Пока нет компьютеров с этой игрой.</p>}
          </DialogContent>
        </Dialog>

        {recs.length > 0 && <section className="mt-16">
          <h2 className="text-2xl font-bold">Похожие игры</h2>
          <p className="mt-1 text-sm text-muted-foreground">{game.category?.name ? `Ещё из жанра «${game.category.name}» и не только` : "Тебе может понравиться"}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">{recs.map((g) => <GameCard key={g.id} game={g} />)}</div>
        </section>}
      </div>
    </main>
  );
}

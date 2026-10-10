import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { Cloud, Sparkles } from "lucide-react";
import { coverOf, effectivePrice, type CatalogGame } from "@/lib/catalog";
import { formatPlaytime, useBalance } from "@/lib/playtime";

export function GameCard({ game }: { game: CatalogGame }) {
  const balance = useBalance();
  const rate = effectivePrice(game);
  const playtime = formatPlaytime(balance, rate);
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const onLeave = () => { const el = ref.current; if (!el) return; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };

  return (
    <Link ref={ref} to="/computer/$slug" params={{ slug: game.slug }} onPointerMove={onMove} onPointerLeave={onLeave} className="game-card fx-card group block">
      <div className="fx-glow" aria-hidden />
      <div className="relative aspect-[1.59] overflow-hidden">
        <img src={coverOf(game)} alt={game.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
        <div className="fx-glare" aria-hidden />
        {game.label && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-lg"><Sparkles size={12} />{game.label}</span>}
        {game.discount_percent > 0 && <span className="absolute bottom-2 left-2 rounded-full bg-destructive px-2.5 py-1 text-xs font-black text-destructive-foreground shadow-lg group-hover:opacity-0">−{game.discount_percent}%</span>}
        {game.cloud_saves && <span title="Облачные сохранения" className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/70 backdrop-blur"><Cloud size={15} /></span>}
        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {game.about && <p className="line-clamp-2 text-xs text-foreground/90">{game.about}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
            {game.category?.name && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-primary">{game.category.name}</span>}
            {game.year && <span className="rounded-full bg-muted/70 px-2 py-0.5">{game.year}</span>}
          </div>
        </div>
      </div>
      <div className="relative p-3">
        <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">{game.title}</h3>
        {game.developer && <p className="truncate text-xs text-muted-foreground">{game.developer}</p>}
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-lg font-bold">{game.discount_percent > 0 && <span className="mr-1 text-xs font-normal text-muted-foreground line-through">{game.price}</span>}от {rate} ₽<span className="text-xs font-normal text-muted-foreground">/час</span></p>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary"><span className="size-1.5 animate-pulse rounded-full bg-primary" />онлайн</span>
        </div>
        {playtime && <p className="text-xs text-primary">{playtime}</p>}
      </div>
    </Link>
  );
}

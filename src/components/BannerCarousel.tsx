import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

export type Banner = { id: string; title: string; description: string; image_url: string; link_url: string };

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });

  return (
    <div className="relative mt-7">
      <div
        ref={ref}
        className="no-scrollbar flex cursor-grab select-none gap-6 overflow-x-auto active:cursor-grabbing"
        onPointerDown={(e) => { if (e.pointerType !== "mouse") return; drag.current = { down: true, x: e.clientX, left: ref.current!.scrollLeft, moved: false }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d.down) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true; ref.current!.scrollLeft = d.left - dx; }}
        onPointerUp={() => { drag.current.down = false; }}
        onPointerLeave={() => { drag.current.down = false; }}
        onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; } }}
      >
        {banners.map((b) => {
          const inner = <><img src={b.image_url} alt="" draggable={false} /><div><h2>{b.title}</h2><p>{b.description}</p></div></>;
          return b.link_url
            ? <a key={b.id} href={b.link_url} draggable={false} className="promo-card">{inner}</a>
            : <article key={b.id} className="promo-card">{inner}</article>;
        })}
      </div>
      <button aria-label="Назад" onClick={() => scroll(-1)} className="absolute left-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur hover:bg-background"><ChevronLeft /></button>
      <button aria-label="Вперёд" onClick={() => scroll(1)} className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur hover:bg-background"><ChevronRight /></button>
    </div>
  );
}

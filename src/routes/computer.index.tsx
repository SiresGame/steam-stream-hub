import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Gamepad2, Headphones, Menu, Search, SlidersHorizontal, UserRound, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { siteLinksQuery } from "@/lib/site-links";
import { SiteLinkItem } from "@/components/SiteLink";
import { GameCard } from "@/components/GameCard";
import { PCAdvisor } from "@/components/PCAdvisor";
import { GameAdvisor } from "@/components/GameAdvisor";
import { BannerCarousel } from "@/components/BannerCarousel";
import { catalogQuery } from "@/lib/catalog";
import weakPc from "@/assets/fogplay/weak-pc.webp";
import cloudSaves from "@/assets/fogplay/cloud-saves.webp";
import gamesBanner from "@/assets/fogplay/games.webp";

export const Route = createFileRoute("/computer/")({
  head: () => ({
    meta: [
      { title: "МТС Fog Play — облачный гейминг" },
      { name: "description", content: "Играй в ПК-игры без скачивания на смартфоне, компьютере, макбуке или ТВ." },
      { property: "og:title", content: "МТС Fog Play — облачный гейминг" },
      { property: "og:description", content: "Тысячи игр на максимальных настройках прямо в браузере." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  errorComponent: () => <main className="p-10 text-center">Не удалось загрузить игры</main>,
  notFoundComponent: () => <main className="p-10 text-center">Страница не найдена</main>,
  component: Catalog,
});


function Logo() {
  return <div className="flex items-center gap-2 font-bold leading-none"><span className="flex size-7 items-end justify-center rounded-sm bg-primary pb-1 text-primary-foreground">⌁</span><span>МТС<br />FOG PLAY</span><sup className="text-muted-foreground">β</sup></div>;
}

function Catalog() {
  const [search, setSearch] = useState("");
  const [cookie, setCookie] = useState(true);
  const [menu, setMenu] = useState(false);
  const { data } = useSuspenseQuery(catalogQuery);
  const [genre, setGenre] = useState("all");
  const genreScroll = useRef<HTMLDivElement>(null);
  const genreDrag = useRef({ down: false, x: 0, left: 0, moved: false });
  const games = data.games;
  const genres = [...data.categories, { id: "all", name: "Все жанры", slug: "all" }];
  const filtered = useMemo(() => games.filter((game) => game.title.toLowerCase().includes(search.toLowerCase()) && (genre === "all" || game.category?.slug === genre)), [games, search, genre]);
  const links = useQuery(siteLinksQuery).data ?? [];
  const headerLinks = links.filter((l) => l.placement === "header");
  const footerLinks = links.filter((l) => l.placement === "footer");

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" aria-label="На главную"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {headerLinks.map((l) => <SiteLinkItem key={l.id} url={l.url}>{l.label}</SiteLinkItem>)}
          <Link to="/support" aria-label="Поддержка"><Headphones size={20} className="text-brand-blue" /></Link>
          <Button asChild className="h-9 gap-2 px-4" variant="icon"><Link to="/profile"><UserRound size={16} /> Профиль</Link></Button>
        </nav>
        <Link to="/support" aria-label="Поддержка" className="ml-auto mr-2 md:hidden"><Headphones size={22} className="text-brand-blue" /></Link><Button aria-label="Меню" variant="ghost" className="size-10 md:hidden" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</Button>
      </header>
      {menu && <nav className="mx-4 mb-4 grid gap-3 border-b border-border pb-4 text-sm md:hidden">{headerLinks.map((l) => <SiteLinkItem key={l.id} url={l.url}>{l.label}</SiteLinkItem>)}<Button asChild className="h-10"><Link to="/profile">Профиль</Link></Button></nav>}

      <section className="hero-band mx-auto max-w-6xl px-6 py-5 md:px-8">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold"><span className="text-brand-blue">Облачный</span> <span className="text-brand-pink">гейминг</span></h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">Играй в ПК-игры без скачивания на смартфоне, компьютере, макбуке или ТВ. МТС Fog Play объединяет геймеров и владельцев игровых ПК.</p>
        </div>
        <Gamepad2 className="hero-gamepad" strokeWidth={1.2} />
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex gap-6 text-xl font-bold"><Link to="/computer" className="text-foreground">Игры</Link><Link to="/servers" className="text-brand-blue/50 hover:text-brand-blue">Серверы</Link></div>
          <label className="flex h-12 flex-1 items-center gap-3 rounded-md bg-input px-4"><Search size={22} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Введите название игры" /></label>
        </div>

        <BannerCarousel banners={data.banners.length ? data.banners : [{ id: "1", title: "Если у тебя слабый ПК", description: "играй без лагов на Fog Play", image_url: weakPc, link_url: "" }, { id: "2", title: "Играй в тысячи игр", description: "платишь только за время", image_url: gamesBanner, link_url: "" }, { id: "3", title: "Сейвы хранятся в облаке", description: "продолжай с того места", image_url: cloudSaves, link_url: "" }]} />

        {data.games.some((g) => g.discount_percent > 0) && <section className="mt-8">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><span className="rounded-full bg-destructive px-3 py-0.5 text-sm font-black text-destructive-foreground">SALE</span>Скидки и акции</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">{data.games.filter((g) => g.discount_percent > 0).sort((a, b) => b.discount_percent - a.discount_percent).slice(0, 8).map((g) => <GameCard key={g.id} game={g} />)}</div>
        </section>}

        <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {filtered.slice(0, 4).map((game) => <GameCard key={game.id} game={game} />)}
        </section>

        <div
          ref={genreScroll}
          className="genre-scroll no-scrollbar mt-8 flex cursor-grab select-none gap-3 overflow-x-auto pb-2 active:cursor-grabbing"
          onPointerDown={(e) => { if (e.pointerType !== "mouse") return; genreDrag.current = { down: true, x: e.clientX, left: genreScroll.current!.scrollLeft, moved: false }; }}
          onPointerMove={(e) => { const d = genreDrag.current; if (!d.down) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true; genreScroll.current!.scrollLeft = d.left - dx; }}
          onPointerUp={() => { genreDrag.current.down = false; }}
          onPointerLeave={() => { genreDrag.current.down = false; }}
          onClickCapture={(e) => { if (genreDrag.current.moved) { e.preventDefault(); e.stopPropagation(); genreDrag.current.moved = false; } }}
        >
          {genres.map((c) => <Button key={c.slug} variant={genre === c.slug ? "primary" : "icon"} onClick={() => setGenre(c.slug)} className="h-14 shrink-0 gap-2 px-6 text-base"><Gamepad2 size={22} />{c.name}</Button>)}
        </div>

        <div className="mt-7 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">Сортировать по: <button className="flex items-center gap-1 font-semibold text-foreground">Сначала популярные <ChevronDown size={15} /></button></div>
          <Button aria-label="Фильтры" variant="icon" className="size-11"><SlidersHorizontal size={20} /></Button>
        </div>

        {filtered.length > 0 ? <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">{filtered.slice(4).map((game) => <GameCard key={game.id} game={game} />)}</section> : <div className="py-24 text-center"><h2 className="text-xl font-bold">По заданным параметрам поиска ничего не найдено</h2><p className="mt-2 text-muted-foreground">Попробуй изменить запрос</p></div>}
        <GameAdvisor genres={data.categories} />
        <PCAdvisor />
      </div>

      <footer className="border-t border-border"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground md:grid-cols-4 md:px-6"><Link to="/" aria-label="На главную"><Logo /></Link><div className="grid grid-cols-2 gap-2 md:col-span-3 md:grid-cols-3">{footerLinks.map((l) => <SiteLinkItem key={l.id} url={l.url} className="hover:text-foreground">{l.label}</SiteLinkItem>)}<span>© 2026</span></div></div></footer>

      {cookie && <div className="cookie-bar"><span>Наш сайт использует cookie для улучшения работоспособности сайта. <a href="#cookies" className="underline">Подробнее</a></span><Button variant="ghost" className="h-8 px-3 text-sm text-cookie-foreground" onClick={() => setCookie(false)}>Хорошо</Button></div>}
    </main>
  );
}


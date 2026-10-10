import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { ComputerList } from "@/components/ComputerList";
import { catalogQuery } from "@/lib/catalog";

export const Route = createFileRoute("/computer/")({
  head: () => ({ meta: [
    { title: "Каталог игр для ПК — облачный гейминг" },
    { name: "description", content: "Все игры для компьютера, доступные в облаке: поиск, жанры и цены за час." },
    { property: "og:title", content: "Каталог игр для ПК — облачный гейминг" },
    { property: "og:description", content: "Выбери игру и запусти её в облаке без скачивания." },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  errorComponent: () => <main className="p-10 text-center">Не удалось загрузить каталог</main>,
  notFoundComponent: () => <main className="p-10 text-center">Каталог не найден</main>,
  component: Catalog,
});

function Catalog() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all");
  const list = useMemo(() => data.games.filter((g) => g.title.toLowerCase().includes(q.toLowerCase()) && (cat === "all" || g.category?.slug === cat)), [data, q, cat]);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6">
      <Link to="/" className="text-sm text-muted-foreground">← На главную</Link>
      <h1 className="mt-4 text-3xl font-bold">Игры для компьютера</h1>
      <label className="mt-6 flex h-12 items-center gap-3 rounded-md bg-input px-4"><Search size={20} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Введите название игры" className="w-full bg-transparent text-sm outline-none" /></label>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {[{ slug: "all", name: "Все жанры" }, ...data.categories].map((c) => <Button key={c.slug} variant={cat === c.slug ? "primary" : "icon"} onClick={() => setCat(c.slug)} className="shrink-0">{c.name}</Button>)}
      </div>
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">{list.map((g) => <GameCard key={g.id} game={g} />)}</section>
      {list.length === 0 && <p className="py-20 text-center text-muted-foreground">Ничего не найдено</p>}
      <ComputerList computers={data.computers} />
    </main>
  );
}

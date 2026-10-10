import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminCategoriesQuery, adminGamesQuery } from "@/lib/admin";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

function Dashboard() {
  const games = useQuery(adminGamesQuery); const cats = useQuery(adminCategoriesQuery);
  const g = games.data ?? [];
  const stats = [
    { label: "Всего игр", value: g.length },
    { label: "Опубликовано", value: g.filter((x) => x.published).length },
    { label: "Черновики", value: g.filter((x) => !x.published).length },
    { label: "Каталогов", value: cats.data?.length ?? 0 },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Обзор</h1><Button asChild><Link to="/admin/games">Добавить игру</Link></Button></div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map((s) => <div key={s.label} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{s.label}</p><p className="mt-2 text-3xl font-bold">{s.value}</p></div>)}</div>
      <h2 className="mt-8 text-lg font-semibold">Последние игры</h2>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">{g.slice(0, 5).map((x) => <li key={x.id} className="flex justify-between px-4 py-3 text-sm"><span>{x.title}</span><span className="text-muted-foreground">{x.category?.name ?? "Без каталога"}</span></li>)}</ul>
    </div>
  );
}

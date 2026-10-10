import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ComputerList } from "@/components/ComputerList";
import { catalogQuery } from "@/lib/catalog";

export const Route = createFileRoute("/servers")({
  head: () => ({
    meta: [
      { title: "Серверы — аренда игровых ПК" },
      { name: "description", content: "Свободные игровые компьютеры для аренды по часам." },
      { property: "og:title", content: "Серверы — аренда игровых ПК" },
      { property: "og:description", content: "Выберите свободный игровой ПК и играйте в облаке." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  errorComponent: () => <main className="p-10 text-center">Не удалось загрузить серверы</main>,
  notFoundComponent: () => <main className="p-10 text-center">Страница не найдена</main>,
  component: Servers,
});

function Servers() {
  const { data } = useSuspenseQuery(catalogQuery);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />На главную</Link>
      <h1 className="mt-6 text-3xl font-bold">Серверы</h1>
      {data.computers.length ? <ComputerList computers={data.computers} /> : <p className="mt-6 text-muted-foreground">Компьютеров пока нет</p>}
    </main>
  );
}

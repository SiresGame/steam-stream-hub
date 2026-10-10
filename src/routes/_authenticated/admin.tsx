import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Monitor, FolderTree, Gamepad2, LayoutDashboard, LogOut, ExternalLink, Users, Image, LifeBuoy, Wallet, KeyRound, ListTodo, PanelsTopLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
  { to: "/admin/stats", label: "Онлайн", icon: Activity },
  { to: "/admin/games", label: "Игры", icon: Gamepad2 },
  { to: "/admin/categories", label: "Каталоги", icon: FolderTree },
  { to: "/admin/computers", label: "Компьютеры", icon: Monitor },
  { to: "/admin/players", label: "Игроки и сессии", icon: Users },
  { to: "/admin/revenue", label: "Доходы и вывод", icon: Wallet },
  { to: "/admin/banners", label: "Баннеры", icon: Image },
  { to: "/admin/promos", label: "Промокоды", icon: KeyRound },
  { to: "/admin/tickets", label: "Тикеты", icon: LifeBuoy },
  { to: "/admin/accounts", label: "Аккаунты игр", icon: KeyRound },
  { to: "/admin/links", label: "Разделы сайта", icon: PanelsTopLeft },
  { to: "/platform/backlog", label: "Бэклог", icon: ListTodo },
] as const;

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const role = useQuery({ queryKey: ["is-admin", user.id], queryFn: async () => { const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }); return !!data; } });
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }

  if (role.isLoading) return <div className="p-10 text-muted-foreground">Загрузка…</div>;
  if (!role.data) return <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-xl font-bold">Нет доступа</h1><p className="mt-2 text-muted-foreground">У аккаунта {user.email} нет прав администратора.</p><Button className="mt-4" onClick={signOut}>Выйти</Button></div>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="p-4 text-lg font-bold">Админ-панель</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {nav.map((n) => <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent" activeProps={{ className: "bg-accent text-foreground" }}><n.icon size={18} />{n.label}</Link>)}
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"><ExternalLink size={18} />На сайт</Link>
        </nav>
        <div className="hidden p-4 md:absolute md:bottom-0 md:block md:w-60"><p className="truncate text-xs text-muted-foreground">{user.email}</p><Button variant="ghost" className="mt-2 w-full justify-start gap-2" onClick={signOut}><LogOut size={16} />Выйти</Button></div>
      </aside>
      <main className="flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}

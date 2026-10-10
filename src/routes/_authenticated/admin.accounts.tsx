import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/accounts")({
  head: () => ({ meta: [{ title: "Аккаунты игр — админ-панель" }, { name: "robots", content: "noindex" }] }),
  component: Accounts,
});

function Accounts() {
  const qc = useQueryClient();
  const games = useQuery({ queryKey: ["admin-games-min"], queryFn: async () => (await supabase.from("games").select("id, title").order("title")).data ?? [] });
  const accounts = useQuery({ queryKey: ["admin-accounts"], queryFn: async () => (await supabase.from("game_accounts").select("id, login, price, note, sold_to, sold_at, game:games(title)").order("created_at", { ascending: false })).data ?? [] });
  const buyers = useQuery({ queryKey: ["admin-buyers"], queryFn: async () => (await supabase.from("profiles").select("id, email")).data ?? [] });
  const [gameId, setGameId] = useState(""); const [login, setLogin] = useState(""); const [password, setPassword] = useState(""); const [price, setPrice] = useState("499"); const [note, setNote] = useState("");

  async function add() {
    const p = Number(price);
    if (!gameId || !login.trim() || !password.trim() || !Number.isInteger(p) || p < 0) { toast.error("Заполни игру, логин, пароль и цену"); return; }
    const { error } = await supabase.from("game_accounts").insert({ game_id: gameId, login: login.trim(), password: password.trim(), price: p, note: note.trim() });
    if (error) { toast.error("Не удалось добавить"); return; }
    toast.success("Аккаунт добавлен"); setLogin(""); setPassword(""); setNote(""); qc.invalidateQueries({ queryKey: ["admin-accounts"] });
  }
  async function remove(id: string) { if (!confirm("Удалить аккаунт?")) return; await supabase.from("game_accounts").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-accounts"] }); }
  const email = (id: string | null) => buyers.data?.find((b) => b.id === id)?.email ?? id;

  return (
    <div>
      <h1 className="text-2xl font-bold">Аккаунты игр</h1>
      <p className="mt-1 text-sm text-muted-foreground">Аккаунты для продажи. Игрок покупает аккаунт, деньги списываются с баланса, а данные для входа появляются в его библиотеке.</p>
      <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-6">
        <select value={gameId} onChange={(e) => setGameId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"><option value="">Выбери игру</option>{games.data?.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
        <Input placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} />
        <Input placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input placeholder="Цена, ₽" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button onClick={add}>Добавить</Button>
        <Input className="md:col-span-6" placeholder="Заметка для покупателя (необязательно)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Игра</th><th className="p-3">Логин</th><th className="p-3">Цена</th><th className="p-3">Статус</th><th /></tr></thead>
          <tbody>
            {!accounts.data?.length && <tr><td colSpan={5} className="p-4 text-muted-foreground">Аккаунтов пока нет</td></tr>}
            {accounts.data?.map((a) => <tr key={a.id} className="border-b border-border last:border-0"><td className="p-3">{a.game?.title}</td><td className="p-3 font-mono">{a.login}</td><td className="p-3">{a.price} ₽</td><td className="p-3">{a.sold_to ? <span className="text-muted-foreground">Продан: {email(a.sold_to)}</span> : <span className="text-primary">В продаже</span>}</td><td className="p-3 text-right">{!a.sold_to && <Button variant="ghost" size="icon" aria-label="Удалить" onClick={() => remove(a.id)}><Trash2 size={16} /></Button>}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

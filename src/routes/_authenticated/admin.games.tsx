import type { Tables } from "@/integrations/supabase/types";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { fetchSteamGame, syncSteamDetails } from "@/lib/steam.functions";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { adminCategoriesQuery, adminGamesQuery, slugify } from "@/lib/admin";
import { coverOf } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/games")({ component: Games });

type Game = Tables<"games"> & { category: { name: string } | null };
const schema = z.object({
  title: z.string().trim().min(1, "Введите название").max(120),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9а-яё-]+$/i, "Адрес: только буквы, цифры и дефис"),
  category_id: z.string().uuid().nullable(),
  image_url: z.string().trim().url("Неверная ссылка на обложку").max(1000).or(z.literal("")),
  about: z.string().trim().max(3000), developer: z.string().trim().max(120),
  year: z.coerce.number().int().min(1970).max(2100).nullable(),
  price: z.coerce.number().int().min(0).max(100000),
  discount_percent: z.coerce.number().int().min(0, "Скидка от 0 до 90%").max(90, "Скидка от 0 до 90%"),
  label: z.string().trim().max(40), cloud_saves: z.boolean(), published: z.boolean(),
});

function Games() {
  const qc = useQueryClient();
  const { data: games = [], isLoading } = useQuery(adminGamesQuery);
  const { data: cats = [] } = useQuery(adminCategoriesQuery);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [edit, setEdit] = useState<Game | "new" | null>(null);
  const list = useMemo(() => games.filter((g) => g.title.toLowerCase().includes(q.toLowerCase()) && (cat === "all" || g.category_id === cat)), [games, q, cat]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); qc.invalidateQueries({ queryKey: ["game"] }); };
  async function remove(g: Game) { if (!confirm(`Удалить «${g.title}»?`)) return; const { error } = await supabase.from("games").delete().eq("id", g.id); if (error) { toast.error("Ошибка удаления"); return; } toast.success("Игра удалена"); refresh(); }
  async function togglePublished(g: Game) { await supabase.from("games").update({ published: !g.published }).eq("id", g.id); refresh(); }
  const [syncing, setSyncing] = useState(false);
  async function syncSteam() {
    setSyncing(true);
    try {
      let total = 0;
      for (let i = 0; i < 20; i++) { const r = await syncSteamDetails(); total += r.updated; if (!r.remaining || !r.updated) break; }
      toast.success(total ? `Обновлено игр: ${total}` : "Все игры уже заполнены");
      refresh();
    } catch { toast.error("Не удалось получить данные из Steam"); } finally { setSyncing(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Игры</h1><div className="flex gap-2"><Button variant="secondary" disabled={syncing} onClick={syncSteam}>{syncing ? "Загружаем из Steam…" : "Характеристики из Steam"}</Button><Button onClick={() => setEdit("new")} className="gap-2"><Plus size={16} />Добавить игру</Button></div></div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-md border border-input px-3"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию" className="w-full bg-transparent text-sm outline-none" /></label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">Все каталоги</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Игра</th><th className="p-3">Каталог</th><th className="p-3">Цена/час</th><th className="p-3">Показ на сайте</th><th className="p-3" /></tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={5}>Загрузка…</td></tr>}
            {list.map((g) => <tr key={g.id} className="border-b border-border last:border-0">
              <td className="p-3"><div className="flex items-center gap-3"><img src={coverOf(g)} alt="" className="h-10 w-16 rounded object-cover" /><div><p className="font-medium">{g.title}</p><p className="text-xs text-muted-foreground">/{g.slug}</p></div></div></td>
              <td className="p-3">{g.category?.name ?? "—"}</td><td className="p-3">{g.price} ₽{g.discount_percent > 0 && <span className="ml-1 text-xs text-primary">−{g.discount_percent}%</span>}</td>
              <td className="p-3"><Switch checked={g.published} onCheckedChange={() => togglePublished(g)} aria-label="Показывать на сайте" /></td>
              <td className="p-3 text-right"><Button variant="ghost" size="icon" aria-label="Изменить" onClick={() => setEdit(g)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label="Удалить" onClick={() => remove(g)}><Trash2 size={16} /></Button></td>
            </tr>)}
            {!isLoading && list.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>Игр не найдено</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{edit === "new" ? "Новая игра" : "Редактировать игру"}</DialogTitle></DialogHeader>
          {edit !== null && <GameForm game={edit === "new" ? null : edit} cats={cats} onDone={() => { setEdit(null); refresh(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GameForm({ game, cats, onDone }: { game: Game | null; cats: { id: string; name: string }[]; onDone: () => void }) {
  const [title, setTitle] = useState(game?.title ?? ""); const [slug, setSlug] = useState(game?.slug ?? "");
  const [cloud, setCloud] = useState(game?.cloud_saves ?? false); const [pub, setPub] = useState(game?.published ?? true); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ title, slug: slug || slugify(title), category_id: (f.get("category_id") as string) || null, image_url: f.get("image_url"), about: f.get("about"), developer: f.get("developer"), year: (f.get("year") as string) || null, price: f.get("price"), discount_percent: f.get("discount_percent") || 0, label: f.get("label"), cloud_saves: cloud, published: pub });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    const v = { ...parsed.data, image_url: parsed.data.image_url || null, label: parsed.data.label || null };
    setBusy(true);
    const { error } = game ? await supabase.from("games").update(v).eq("id", game.id) : await supabase.from("games").insert(v);
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "Игра с таким адресом уже есть" : "Не удалось сохранить"); return; }
    toast.success(game ? "Изменения сохранены" : "Игра добавлена"); onDone();
  }
  const formRef = useRef<HTMLFormElement>(null);
  const [steamUrl, setSteamUrl] = useState(""); const [loading, setLoading] = useState(false);
  async function loadSteam() {
    setLoading(true);
    try {
      const s = await fetchSteamGame({ data: { url: steamUrl.trim() } });
      setTitle(s.title); if (!game) setSlug(slugify(s.title));
      const f = formRef.current!;
      const set = (n: string, v: string) => { const el = f.elements.namedItem(n) as HTMLInputElement | null; if (el) el.value = v; };
      set("image_url", s.image_url); set("about", s.about); set("developer", s.developer); set("year", s.year ? String(s.year) : "");
      toast.success("Данные из Steam загружены");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось загрузить"); }
    setLoading(false);
  }
  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2"><Label>Ссылка на игру в Steam</Label><div className="flex gap-2"><Input value={steamUrl} onChange={(e) => setSteamUrl(e.target.value)} placeholder="https://store.steampowered.com/app/1091500/" /><Button type="button" variant="secondary" disabled={!steamUrl || loading} onClick={loadSteam}>{loading ? "Загрузка…" : "Загрузить"}</Button></div></div>
      <div className="grid gap-2"><Label>Название</Label><Input value={title} onChange={(e) => { setTitle(e.target.value); if (!game) setSlug(slugify(e.target.value)); }} /></div>
      <div className="grid gap-2"><Label>Адрес страницы</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="cyberpunk-2077" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2"><Label>Каталог</Label><select name="category_id" defaultValue={game?.category_id ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Без каталога</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="grid gap-2"><Label>Цена за час, ₽</Label><Input name="price" type="number" defaultValue={game?.price ?? 35} /></div>
        <div className="grid gap-2"><Label>Скидка, %</Label><Input name="discount_percent" type="number" min={0} max={90} defaultValue={game?.discount_percent ?? 0} /></div>
        <div className="grid gap-2"><Label>Разработчик</Label><Input name="developer" defaultValue={game?.developer ?? ""} /></div>
        <div className="grid gap-2"><Label>Год выхода</Label><Input name="year" type="number" defaultValue={game?.year ?? ""} /></div>
      </div>
      <div className="grid gap-2"><Label>Ссылка на обложку</Label><Input name="image_url" defaultValue={game?.image_url ?? ""} placeholder="https://…/cover.jpg" /></div>
      <div className="grid gap-2"><Label>Описание</Label><Textarea name="about" rows={4} defaultValue={game?.about ?? ""} /></div>
      <div className="grid gap-2"><Label>Метка на карточке</Label><Input name="label" defaultValue={game?.label ?? ""} placeholder="Например, «Новинка»" /></div>
      <label className="flex items-center justify-between text-sm">Облачные сохранения <Switch checked={cloud} onCheckedChange={setCloud} /></label>
      <label className="flex items-center justify-between text-sm">Показывать на сайте <Switch checked={pub} onCheckedChange={setPub} /></label>
      <Button type="submit" disabled={busy} className="h-11">{busy ? "Сохранение…" : "Сохранить"}</Button>
    </form>
  );
}

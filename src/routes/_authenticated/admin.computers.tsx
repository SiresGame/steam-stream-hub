import type { Tables } from "@/integrations/supabase/types";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { adminComputersQuery } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/computers")({ component: Computers });

type PC = Tables<"computers">;
const schema = z.object({ name: z.string().trim().min(1, "Введите название").max(80), cpu: z.string().trim().max(80), gpu: z.string().trim().max(80), ram_gb: z.coerce.number().int().min(1).max(1024), city: z.string().trim().max(80), price: z.coerce.number().int().min(0).max(100000), available: z.boolean() });

function Computers() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(adminComputersQuery);
  const [edit, setEdit] = useState<PC | "new" | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };
  async function toggle(c: PC) { await supabase.from("computers").update({ available: !c.available }).eq("id", c.id); refresh(); }
  async function remove(c: PC) { if (!confirm(`Удалить «${c.name}»?`)) return; const { error } = await supabase.from("computers").delete().eq("id", c.id); if (error) { toast.error("Ошибка удаления"); return; } refresh(); }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Компьютеры</h1><Button className="gap-2" onClick={() => setEdit("new")}><Plus size={16} />Добавить компьютер</Button></div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Название</th><th className="p-3">Видеокарта</th><th className="p-3">Процессор</th><th className="p-3">Город</th><th className="p-3">Цена</th><th className="p-3">Свободен</th><th className="p-3">Блок</th><th className="p-3" /></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-4 text-muted-foreground">Загрузка…</td></tr>}
            {data.map((c) => <tr key={c.id} className="border-b border-border last:border-0"><td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.gpu}</td><td className="p-3">{c.cpu}</td><td className="p-3">{c.city}</td><td className="p-3">{c.price} ₽</td><td className="p-3"><Switch checked={c.available} onCheckedChange={() => toggle(c)} aria-label="Свободен" /></td><td className="p-3"><Switch checked={c.blocked} onCheckedChange={async () => { await supabase.from("computers").update({ blocked: !c.blocked }).eq("id", c.id); refresh(); }} aria-label="Заблокирован" /></td><td className="p-3 text-right"><Button variant="ghost" size="icon" aria-label="Изменить" onClick={() => setEdit(c)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label="Удалить" onClick={() => remove(c)}><Trash2 size={16} /></Button></td></tr>)}
          </tbody>
        </table>
      </div>
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent><DialogHeader><DialogTitle>{edit === "new" ? "Новый компьютер" : "Редактировать компьютер"}</DialogTitle></DialogHeader>
          {edit !== null && <PCForm pc={edit === "new" ? null : edit} onDone={() => { setEdit(null); refresh(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PCForm({ pc, onDone }: { pc: PC | null; onDone: () => void }) {
  const [available, setAvailable] = useState(pc?.available ?? true);
  const link = useQuery({ queryKey: ["admin", "link", pc?.id], enabled: !!pc, queryFn: async () => (await supabase.from("computer_links").select("rent_url").eq("computer_id", pc!.id).maybeSingle()).data?.rent_url ?? "" });
  const games = useQuery({ queryKey: ["admin", "games-list"], queryFn: async () => (await supabase.from("games").select("id, title").order("title")).data ?? [] });
  const installed = useQuery({ queryKey: ["admin", "pc-games", pc?.id], enabled: !!pc, queryFn: async () => ((await supabase.from("computer_games").select("game_id").eq("computer_id", pc!.id)).data ?? []).map((r) => r.game_id) });
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => { if (installed.data) setPicked(installed.data); }, [installed.data]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget));
    const { rent_url: rawUrl, ...rest } = f;
    const parsed = schema.safeParse({ ...rest, available });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    const url = String(rawUrl ?? "").trim();
    if (url && !z.string().url().max(2000).safeParse(url).success) { toast.error("Неверная ссылка"); return; }
    const res = pc ? await supabase.from("computers").update(parsed.data).eq("id", pc.id).select("id").single() : await supabase.from("computers").insert(parsed.data).select("id").single();
    if (res.error) { toast.error("Не удалось сохранить"); return; }
    const l = await supabase.from("computer_links").upsert({ computer_id: res.data.id, rent_url: url });
    if (l.error) { toast.error("Не удалось сохранить ссылку"); return; }
    await supabase.from("computer_games").delete().eq("computer_id", res.data.id);
    if (picked.length) { const g = await supabase.from("computer_games").insert(picked.map((game_id) => ({ computer_id: res.data.id, game_id }))); if (g.error) { toast.error("Не удалось сохранить игры"); return; } }
    toast.success("Сохранено"); onDone();
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-2"><Label>Название</Label><Input name="name" defaultValue={pc?.name ?? ""} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2"><Label>Видеокарта</Label><Input name="gpu" defaultValue={pc?.gpu ?? ""} /></div>
        <div className="grid gap-2"><Label>Процессор</Label><Input name="cpu" defaultValue={pc?.cpu ?? ""} /></div>
        <div className="grid gap-2"><Label>Память, ГБ</Label><Input name="ram_gb" type="number" defaultValue={pc?.ram_gb ?? 16} /></div>
        <div className="grid gap-2"><Label>Цена за час, ₽</Label><Input name="price" type="number" defaultValue={pc?.price ?? 35} /></div>
      </div>
      <div className="grid gap-2"><Label>Ссылка кнопки «Арендовать»</Label><Input name="rent_url" type="url" placeholder="https://..." key={link.data ?? "x"} defaultValue={link.data ?? ""} /></div>
      <div className="grid gap-2"><Label>Город</Label><Input name="city" defaultValue={pc?.city ?? ""} /></div>
      <div className="grid gap-2"><div className="flex items-center justify-between"><Label>Установленные игры</Label><button type="button" className="text-xs text-primary" onClick={() => setPicked(picked.length === games.data?.length ? [] : (games.data ?? []).map((g) => g.id))}>{picked.length === games.data?.length ? "Снять все" : "Выбрать все"}</button></div>
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border p-2">{games.data?.map((g) => <label key={g.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(g.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, g.id] : picked.filter((x) => x !== g.id))} />{g.title}</label>)}</div></div>
      <label className="flex items-center justify-between text-sm">Свободен <Switch checked={available} onCheckedChange={setAvailable} /></label>
      <Button type="submit" className="h-11">Сохранить</Button>
    </form>
  );
}

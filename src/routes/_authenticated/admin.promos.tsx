import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { normalizePromoCode } from "@/lib/promo";

export const Route = createFileRoute("/_authenticated/admin/promos")({
  head: () => ({ meta: [{ title: "Промокоды — админ-панель Fog Play" }, { name: "description", content: "Управление скидками на игровые часы." }, { property: "og:title", content: "Промокоды Fog Play" }, { property: "og:description", content: "Управление скидками на аренду." }, { name: "robots", content: "noindex" }] }),
  component: Promos,
});
function Promos() {
  const qc = useQueryClient();
  const codes = useQuery({ queryKey: ["admin", "promos"], queryFn: async () => { const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const [code, setCode] = useState(""); const [discount, setDiscount] = useState("25"); const [expires, setExpires] = useState(""); const [limit, setLimit] = useState(""); const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault(); const normalized = normalizePromoCode(code); const percent = Number(discount);
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalized)) { toast.error("Код: 3–40 латинских букв, цифр, - или _"); return; }
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) { toast.error("Скидка от 1 до 100%"); return; }
    setBusy(true);
    const { error } = await supabase.from("promo_codes").insert({ code: normalized, discount_percent: percent, expires_at: expires ? new Date(expires).toISOString() : null, max_uses: limit ? Number(limit) : null });
    setBusy(false); if (error) { toast.error(error.code === "23505" ? "Такой промокод уже существует" : "Не удалось создать промокод"); return; }
    setCode(""); toast.success("Промокод создан"); qc.invalidateQueries({ queryKey: ["admin", "promos"] });
  }
  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("promo_codes").update({ active }).eq("id", id);
    if (error) { toast.error("Не удалось изменить промокод"); return; }
    qc.invalidateQueries({ queryKey: ["admin", "promos"] }); qc.invalidateQueries({ queryKey: ["active-promo"] });
  }
  return <div>
    <h1 className="text-2xl font-bold">Промокоды</h1><p className="mt-2 text-sm text-muted-foreground">Скидка на все часы следующей сессии. Каждый игрок может использовать код один раз.</p>
    <form onSubmit={create} className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm">Промокод<Input placeholder="PLAY25" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={40} /></label>
      <label className="grid gap-2 text-sm">Скидка, %<Input type="number" min={1} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} required /></label>
      <label className="grid gap-2 text-sm">Действует до (необязательно)<Input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
      <label className="grid gap-2 text-sm">Лимит активаций (необязательно)<Input type="number" min={1} step={1} placeholder="Без ограничений" value={limit} onChange={(e) => setLimit(e.target.value)} /></label>
      <Button type="submit" disabled={busy} className="sm:col-span-2 sm:justify-self-start">{busy ? "Создаём…" : "Создать промокод"}</Button>
    </form>
    <div className="mt-8 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm"><thead className="bg-card"><tr>{["Код", "Скидка", "Активации", "Действует до", "Включён"].map((h) => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>
        {codes.data?.map((c) => <tr key={c.id} className="border-t border-border"><td className="p-4 font-mono font-bold">{c.code}</td><td className="p-4">{c.discount_percent}%</td><td className="p-4">{c.uses_count} / {c.max_uses ?? "∞"}</td><td className="p-4">{c.expires_at ? new Date(c.expires_at).toLocaleString("ru") : "Бессрочно"}</td><td className="p-4"><Switch aria-label={`Промокод ${c.code}`} checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} /></td></tr>)}
      </tbody></table>
      {codes.isLoading && <p className="p-4">Загрузка…</p>}{codes.isError && <p className="p-4 text-destructive">Не удалось загрузить промокоды</p>}{codes.data?.length === 0 && <p className="p-4 text-muted-foreground">Промокодов пока нет</p>}
    </div>
  </div>;
}

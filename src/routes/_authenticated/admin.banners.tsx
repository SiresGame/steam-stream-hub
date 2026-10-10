import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/banners")({ component: Banners });

type Form = { id?: string; title: string; description: string; image_url: string; link_url: string; sort_order: number; published: boolean };
const empty: Form = { title: "", description: "", image_url: "", link_url: "", sort_order: 0, published: true };

// Сжимает файл в картинку до 1200px и хранит её прямо в записи баннера.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / img.width);
      const c = document.createElement("canvas");
      c.width = img.width * scale; c.height = img.height * scale;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/webp", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function Banners() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const list = useQuery({ queryKey: ["admin", "banners"], queryFn: async () => {
    const { data, error } = await supabase.from("banners").select("*").order("sort_order");
    if (error) throw error; return data;
  } });

  async function save() {
    if (!form.title.trim() || !form.image_url) { toast.error("Нужны заголовок и картинка"); return; }
    const row = { title: form.title.trim(), description: form.description.trim(), image_url: form.image_url, link_url: form.link_url.trim(), sort_order: form.sort_order, published: form.published };
    const { error } = form.id ? await supabase.from("banners").update(row).eq("id", form.id) : await supabase.from("banners").insert(row);
    if (error) { toast.error("Ошибка сохранения"); return; }
    toast.success("Сохранено"); setForm(empty); qc.invalidateQueries();
  }
  async function remove(id: string) {
    if (!confirm("Удалить баннер?")) return;
    await supabase.from("banners").delete().eq("id", id); qc.invalidateQueries();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Баннеры</h1>
      <section className="mt-4 grid max-w-xl gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{form.id ? "Редактировать" : "Новый баннер"}</h2>
        <Input placeholder="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Подпись" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input placeholder="Ссылка на картинку (https://...)" value={form.image_url.startsWith("data:") ? "" : form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <label className="text-sm text-muted-foreground">или загрузите файл <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, image_url: await fileToDataUrl(f) }); }} /></label>
        {form.image_url && <img src={form.image_url} alt="" className="h-28 w-full rounded-lg object-cover" />}
        <Input placeholder="Куда ведёт баннер (необязательно)" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">Порядок <Input type="number" className="w-20" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Показывать</label>
        </div>
        <div className="flex gap-2"><Button onClick={save}>Сохранить</Button>{form.id && <Button variant="ghost" onClick={() => setForm(empty)}>Отмена</Button>}</div>
      </section>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.data?.map((b) => (
          <article key={b.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <img src={b.image_url} alt="" className="h-32 w-full object-cover" />
            <div className="p-3"><p className="font-semibold">{b.title}</p><p className="text-xs text-muted-foreground">{b.published ? "Показывается" : "Скрыт"} · №{b.sort_order}</p>
              <div className="mt-2 flex gap-2"><Button variant="icon" className="h-8 px-3" onClick={() => setForm(b)}>Изменить</Button><Button variant="destructive" className="h-8 px-3" onClick={() => remove(b.id)}>Удалить</Button></div></div>
          </article>
        ))}
      </div>
    </div>
  );
}

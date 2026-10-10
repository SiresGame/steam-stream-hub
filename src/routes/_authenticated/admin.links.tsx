import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminSiteLinksQuery, type Placement, type SiteLink } from "@/lib/site-links";

export const Route = createFileRoute("/_authenticated/admin/links")({
  head: () => ({ meta: [{ title: "Разделы сайта — админ" }, { name: "robots", content: "noindex" }] }),
  component: AdminLinks,
});

const groups: { key: Placement; title: string; hint: string }[] = [
  { key: "header", title: "Меню в шапке", hint: "Ссылки вверху сайта" },
  { key: "footer", title: "Подвал", hint: "Ссылки внизу сайта" },
  { key: "profile", title: "Вкладки профиля", hint: "Свои вкладки с текстом в профиле игрока" },
];

function AdminLinks() {
  const qc = useQueryClient();
  const q = useQuery(adminSiteLinksQuery);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "site-links"] }); qc.invalidateQueries({ queryKey: ["site-links"] }); };

  async function add(placement: Placement) {
    const max = Math.max(0, ...(q.data ?? []).filter((l) => l.placement === placement).map((l) => l.sort_order));
    const { error } = await supabase.from("site_links").insert({ placement, label: placement === "profile" ? "Новая вкладка" : "Новая ссылка", url: placement === "profile" ? "" : "/", sort_order: max + 1 });
    if (error) toast.error("Не удалось добавить"); else refresh();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Разделы сайта</h1>
      {groups.map((g) => {
        const items = (q.data ?? []).filter((l) => l.placement === g.key);
        return (
          <section key={g.key} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">{g.title}</h2><p className="text-sm text-muted-foreground">{g.hint}</p></div>
              <Button size="sm" className="gap-1" onClick={() => add(g.key)}><Plus size={16} />Добавить</Button>
            </div>
            <div className="mt-4 space-y-3">
              {!items.length && <p className="text-sm text-muted-foreground">Пока пусто</p>}
              {items.map((l, i) => <Row key={l.id} link={l} prev={items[i - 1]} next={items[i + 1]} onChange={refresh} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Row({ link, prev, next, onChange }: { link: SiteLink; prev: SiteLink | undefined; next: SiteLink | undefined; onChange: () => void }) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [content, setContent] = useState(link.content);
  const isTab = link.placement === "profile";
  const dirty = label !== link.label || url !== link.url || content !== link.content;

  async function patch(v: Partial<SiteLink>) {
    const { error } = await supabase.from("site_links").update(v).eq("id", link.id);
    if (error) toast.error("Не удалось сохранить"); else onChange();
  }
  async function swap(o?: SiteLink) {
    if (!o) return;
    await supabase.from("site_links").update({ sort_order: o.sort_order }).eq("id", link.id);
    await supabase.from("site_links").update({ sort_order: link.sort_order === o.sort_order ? o.sort_order + 1 : link.sort_order }).eq("id", o.id);
    onChange();
  }
  async function del() {
    if (!confirm(`Удалить «${link.label}»?`)) return;
    const { error } = await supabase.from("site_links").delete().eq("id", link.id);
    if (error) toast.error("Не удалось удалить"); else onChange();
  }

  return (
    <div className={`rounded-xl border border-border p-3 ${link.published ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-40 flex-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Название" />
        <Input className="min-w-40 flex-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={isTab ? "Ссылка-кнопка (необязательно)" : "/support, #faq или https://…"} />
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" aria-label="Выше" disabled={!prev} onClick={() => swap(prev)}><ArrowUp size={16} /></Button>
          <Button size="icon" variant="ghost" aria-label="Ниже" disabled={!next} onClick={() => swap(next)}><ArrowDown size={16} /></Button>
          <Button size="icon" variant="ghost" aria-label={link.published ? "Скрыть" : "Показать"} onClick={() => patch({ published: !link.published })}>{link.published ? <Eye size={16} /> : <EyeOff size={16} />}</Button>
          <Button size="icon" variant="ghost" aria-label="Удалить" onClick={del}><Trash2 size={16} className="text-destructive" /></Button>
        </div>
      </div>
      {isTab && <Textarea className="mt-2" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Текст вкладки" />}
      {dirty && <Button size="sm" className="mt-2" onClick={() => patch({ label: label.trim() || "Без названия", url: url.trim(), content })}>Сохранить</Button>}
    </div>
  );
}

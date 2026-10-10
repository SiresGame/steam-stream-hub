import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCategoriesQuery, slugify } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(adminCategoriesQuery);
  const [name, setName] = useState(""); const [editing, setEditing] = useState<string | null>(null); const [editName, setEditName] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };
  async function add(e: React.FormEvent) {
    e.preventDefault(); const n = name.trim(); if (!n || n.length > 60) { toast.error("Введите название до 60 символов"); return; }
    const { error } = await supabase.from("categories").insert({ name: n, slug: slugify(n), sort_order: data.length + 1 });
    if (error) { toast.error("Не удалось добавить: возможно, такой каталог уже есть"); return; } setName(""); toast.success("Каталог добавлен"); refresh();
  }
  async function save(id: string) { const n = editName.trim(); if (!n) return; const { error } = await supabase.from("categories").update({ name: n }).eq("id", id); if (error) { toast.error("Ошибка сохранения"); return; } setEditing(null); refresh(); }
  async function remove(id: string) { if (!confirm("Удалить каталог? Игры останутся без каталога.")) return; const { error } = await supabase.from("categories").delete().eq("id", id); if (error) { toast.error("Ошибка удаления"); return; } toast.success("Удалено"); refresh(); }
  return (
    <div>
      <h1 className="text-2xl font-bold">Каталоги и жанры</h1>
      <form onSubmit={add} className="mt-6 flex max-w-lg gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новый каталог, например «Стратегии»" /><Button type="submit">Добавить</Button></form>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? <p className="p-4 text-muted-foreground">Загрузка…</p> : data.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
            {editing === c.id ? <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); save(c.id); }}><Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus /><Button type="submit">Сохранить</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Отмена</Button></form>
              : <><div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">Игр: {c.games?.[0]?.count ?? 0}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Изменить" onClick={() => { setEditing(c.id); setEditName(c.name); }}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label="Удалить" onClick={() => remove(c.id)}><Trash2 size={16} /></Button></div></>}
          </div>
        ))}
      </div>
    </div>
  );
}

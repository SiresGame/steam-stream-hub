import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listBacklog } from "@/lib/backlog.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const backlogQuery = queryOptions({ queryKey: ["backlog"], queryFn: () => listBacklog() });

export const Route = createFileRoute("/platform/backlog")({
  loader: ({ context }) => context.queryClient.ensureQueryData(backlogQuery),
  head: () => ({ meta: [
    { title: "Бэклог — задачи в работе | Fog Play" },
    { name: "description", content: "Список задач, над которыми сейчас работает команда. Предложи свою идею — мы её рассмотрим." },
    { property: "og:title", content: "Бэклог платформы" },
    { property: "og:description", content: "Задачи в работе и завершённые улучшения платформы." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Backlog,
});

const prio: Record<string, { label: string; cls: string }> = {
  high: { label: "Высокий", cls: "bg-destructive/15 text-destructive" },
  medium: { label: "Средний", cls: "bg-brand-blue/15 text-brand-blue" },
  low: { label: "Низкий", cls: "bg-muted text-muted-foreground" },
};

function Backlog() {
  const { data } = useSuspenseQuery(backlogQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const isAdmin = useQuery({ queryKey: ["backlog-admin"], queryFn: async () => { const { data: u } = await supabase.auth.getUser(); if (!u.user) return false; return (await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" })).data === true; } });
  const proposed = useQuery({ queryKey: ["backlog-proposed"], enabled: isAdmin.data === true, queryFn: async () => (await supabase.from("backlog_tasks").select("*").eq("status", "proposed").order("created_at")).data ?? [] });
  const inWork = data.filter((t) => t.status === "in_progress");
  const done = data.filter((t) => t.status === "done");

  async function propose() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/auth" }); return; }
    setOpen(true);
  }
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("backlog_tasks").update({ status }).eq("id", id);
    if (error) { toast.error("Не удалось обновить"); return; }
    qc.invalidateQueries({ queryKey: ["backlog"] }); qc.invalidateQueries({ queryKey: ["backlog-proposed"] });
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />На главную</Link>
      <section className="mt-6 flex flex-col justify-between gap-6 rounded-3xl bg-card p-6 md:flex-row md:items-end md:p-10">
        <div>
          <h1 className="text-4xl font-black md:text-5xl">Бэклог</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Над чем команда работает прямо сейчас и что уже сделано. Есть идея, как улучшить сервис? Предложи задачу — мы её обязательно посмотрим.</p>
        </div>
        <Button className="h-12 gap-2 px-6 text-base" onClick={propose}><Plus size={18} />Предложить задачу</Button>
      </section>

      <h2 className="mt-10 text-2xl font-bold">Задачи в работе</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[1fr_140px_240px] gap-4 border-b border-border px-5 py-3 text-sm text-muted-foreground md:grid"><span>Задача</span><span>Приоритет</span><span>Автор задачи / Источник</span></div>
        {!inWork.length && <p className="p-5 text-muted-foreground">Сейчас задач в работе нет.</p>}
        {inWork.map((t) => (
          <article key={t.id} className="grid gap-3 border-b border-border px-5 py-5 last:border-0 md:grid-cols-[1fr_140px_240px] md:gap-4">
            <div><h3 className="font-semibold">{t.title}</h3>{t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}</div>
            <div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${prio[t.priority]?.cls ?? ""}`}>{prio[t.priority]?.label ?? t.priority}</span></div>
            <p className="text-sm text-muted-foreground">{t.author || "Игрок"} / {t.source}</p>
            {isAdmin.data && <Button size="sm" variant="ghost" className="w-fit md:col-span-3" onClick={() => setStatus(t.id, "done")}>Отметить завершённой</Button>}
          </article>
        ))}
      </div>

      <h2 className="mt-10 text-2xl font-bold">Завершённые задачи</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {done.map((t) => (
          <article key={t.id} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-start gap-2 font-semibold"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />{t.title}</h3>
            {t.description && <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>}
            <p className="mt-3 text-xs text-muted-foreground">{t.author || "Игрок"} / {t.source}</p>
          </article>
        ))}
      </div>

      {isAdmin.data && (
        <>
          <h2 className="mt-10 text-2xl font-bold">Предложения игроков <span className="text-base font-normal text-muted-foreground">видно только админам</span></h2>
          <div className="mt-4 grid gap-3">
            {!proposed.data?.length && <p className="text-muted-foreground">Новых предложений нет.</p>}
            {proposed.data?.map((t) => (
              <article key={t.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
                <div><h3 className="font-semibold">{t.title}</h3><p className="text-sm text-muted-foreground">{t.description}</p><p className="mt-1 text-xs text-muted-foreground">{t.author}</p></div>
                <div className="flex gap-2"><Button size="sm" onClick={() => setStatus(t.id, "in_progress")}>В работу</Button><Button size="sm" variant="ghost" onClick={() => setStatus(t.id, "rejected")}>Отклонить</Button></div>
              </article>
            ))}
          </div>
        </>
      )}

      <ProposeDialog open={open} onOpenChange={setOpen} />
    </main>
  );
}

function ProposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (title.trim().length < 3) { toast.error("Название — минимум 3 символа"); return; }
    setBusy(true);
    const { error } = await supabase.from("backlog_tasks").insert({ title: title.trim().slice(0, 150), description: desc.trim().slice(0, 2000), author: u.user.email ?? "", created_by: u.user.id, status: "proposed" });
    setBusy(false);
    if (error) { toast.error("Не удалось отправить"); return; }
    toast.success("Спасибо! Мы рассмотрим задачу"); setTitle(""); setDesc(""); onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Предложить задачу</DialogTitle></DialogHeader>
        <Input maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Коротко: что улучшить?" />
        <Textarea rows={5} maxLength={2000} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Опиши подробнее, зачем это нужно" />
        <Button disabled={busy} onClick={send}>{busy ? "Отправляем…" : "Отправить"}</Button>
      </DialogContent>
    </Dialog>
  );
}

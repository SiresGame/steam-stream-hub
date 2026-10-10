import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TicketThread, statusLabel } from "@/components/TicketThread";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Поддержка — тикеты" }, { name: "description", content: "Обращения в техническую поддержку." }, { property: "og:title", content: "Поддержка" }, { property: "og:description", content: "Тикеты технической поддержки" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Support,
});

function Support() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const isAdmin = useQuery({ queryKey: ["is-admin", user.id], queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data === true });
  const tickets = useQuery({ queryKey: ["tickets", user.id], queryFn: async () => {
    const { data, error } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error; return data;
  } });

  async function create() {
    if (subject.trim().length < 3 || text.trim().length < 3) { toast.error("Заполните тему и описание"); return; }
    const { error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject: subject.trim().slice(0, 160), description: text.trim().slice(0, 5000) });
    if (error) { toast.error("Не удалось создать тикет"); return; }
    setSubject(""); setText(""); toast.success("Тикет создан"); qc.invalidateQueries({ queryKey: ["tickets"] });
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />На главную</Link>
      <h1 className="mt-6 text-3xl font-bold">Техническая поддержка</h1>
      {isAdmin.data && <Link to="/admin/tickets" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Открыть тикеты игроков</Link>}
      <section className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">Новое обращение</h2>
        <Input placeholder="Тема" value={subject} maxLength={160} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Опишите проблему" value={text} maxLength={5000} onChange={(e) => setText(e.target.value)} />
        <Button onClick={create} className="justify-self-start">Отправить</Button>
      </section>
      <h2 className="mt-8 text-xl font-bold">Мои тикеты</h2>
      <div className="mt-3 grid gap-3">
        {tickets.data?.length === 0 && <p className="text-muted-foreground">Обращений пока нет</p>}
        {tickets.data?.map((t) => (
          <article key={t.id} className="rounded-2xl border border-border bg-card p-4">
            <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
              <span className="font-semibold">{t.subject}</span><span className="text-xs text-muted-foreground">{statusLabel[t.status]}</span>
            </button>
            {open === t.id && <TicketThread ticket={t} userId={user.id} />}
          </article>
        ))}
      </div>
    </main>
  );
}

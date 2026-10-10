import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TicketThread, statusLabel } from "@/components/TicketThread";

export const Route = createFileRoute("/_authenticated/admin/tickets")({ component: Tickets });

function Tickets() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("t"));
  const data = useQuery({ queryKey: ["admin", "tickets"], queryFn: async () => {
    const [t, p] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email"),
    ]);
    if (t.error) throw t.error; return { tickets: t.data, players: p.data ?? [] };
  } });
  async function setStatus(id: string, status: string) {
    await supabase.from("support_tickets").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  }
  return (
    <div>
      <h1 className="text-2xl font-bold">Тикеты поддержки</h1>
      <div className="mt-4 grid gap-3">
        {data.data?.tickets.length === 0 && <p className="text-muted-foreground">Тикетов нет</p>}
        {data.data?.tickets.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="text-left" onClick={() => setOpen(open === t.id ? null : t.id)}><span className="font-semibold">{t.subject}</span><span className="block text-xs text-muted-foreground">{data.data.players.find((p) => p.id === t.user_id)?.email} · {new Date(t.created_at).toLocaleString("ru-RU")}</span></button>
              <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm">
                {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {open === t.id && <TicketThread ticket={t} userId={user.id} admin />}
          </article>
        ))}
      </div>
    </div>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { draftTicketReply } from "@/lib/ticket-reply.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const statusLabel: Record<string, string> = { open: "Открыт", in_progress: "В работе", closed: "Закрыт" };
type Ticket = { id: string; user_id: string; description: string; status: string; created_at: string };

export function TicketThread({ ticket, userId, admin = false }: { ticket: Ticket; userId: string; admin?: boolean }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState("");
  const [drafting, setDrafting] = useState(false);
  const draft = useServerFn(draftTicketReply);
  async function aiDraft() {
    setDrafting(true);
    try { const r = await draft({ data: { ticketId: ticket.id, hint } }); setMsg(r.text); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка AI"); }
    finally { setDrafting(false); }
  }
  const msgs = useQuery({ queryKey: ["ticket-messages", ticket.id], refetchInterval: 10000, queryFn: async () => {
    const { data, error } = await supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at");
    if (error) throw error; return data;
  } });
  async function send() {
    const m = msg.trim(); if (!m) return;
    const { error } = await supabase.from("support_messages").insert({ ticket_id: ticket.id, user_id: userId, message: m.slice(0, 5000), from_support: admin });
    if (error) { toast.error("Не удалось отправить"); return; }
    setMsg(""); qc.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
  }
  const bubble = (mine: boolean) => mine ? "ml-auto bg-primary/15" : "bg-muted";
  return (
    <div className="mt-3 grid gap-2">
      <p className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-3 text-sm ${bubble(ticket.user_id === userId)}`}>{ticket.description}</p>
      {msgs.data?.map((m) => (
        <p key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-3 text-sm ${bubble(admin ? m.from_support : !m.from_support)}`}>
          <span className="mb-1 block text-xs text-muted-foreground">{m.from_support ? <b className="text-primary">Поддержка</b> : "Игрок"} · {new Date(m.created_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span>{m.message}
        </p>
      ))}
      {ticket.status !== "closed" ? <div className="mt-2 grid gap-2">{admin && <div className="flex flex-wrap gap-2"><input value={hint} maxLength={500} onChange={(e) => setHint(e.target.value)} placeholder="Подсказка для AI (необязательно)" className="h-9 flex-1 rounded-md border border-border bg-input px-3 text-sm" /><Button variant="icon" className="h-9 gap-2" disabled={drafting} onClick={aiDraft}><Sparkles size={16} />{drafting ? "Готовлю…" : "Ответ с AI"}</Button></div>}<Textarea value={msg} maxLength={5000} onChange={(e) => setMsg(e.target.value)} placeholder="Сообщение" /><Button onClick={send} className="justify-self-end">Отправить</Button></div> : <p className="text-xs text-muted-foreground">Тикет закрыт</p>}
    </div>
  );
}

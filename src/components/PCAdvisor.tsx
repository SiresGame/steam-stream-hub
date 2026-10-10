import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recommendPCs, type Recommendation } from "@/lib/recommend.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RentButton } from "./RentButton";

export function PCAdvisor() {
  const navigate = useNavigate();
  const run = useServerFn(recommendPCs);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ summary: string; balance: number; items: Recommendation[] } | null>(null);

  async function ask() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try { setRes(await run({ data: { query: q } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
    finally { setBusy(false); }
  }

  return (
    <section className="mt-12 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="text-primary" size={22} />AI-подбор компьютера</h2>
      <p className="mt-1 text-sm text-muted-foreground">Опишите игру и нужную производительность — подберём свободный ПК под ваш баланс.</p>
      <Textarea className="mt-4" rows={3} maxLength={500} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например: Cyberpunk 2077 на ультра, хочу 60+ FPS" />
      <Button className="mt-3 gap-2" disabled={busy || q.trim().length < 3} onClick={ask}><Sparkles size={16} />{busy ? "Подбираем…" : "Подобрать"}</Button>
      {res && (
        <div className="mt-5">
          {res.summary && <p className="text-sm">{res.summary}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Ваш баланс: {res.balance} ₽</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {res.items.map((r) => (
              <article key={r.id} className="rounded-xl border border-border p-4">
                <h3 className="font-semibold">{r.name}</h3>
                <p className="text-sm text-muted-foreground">{r.price} ₽/час · хватит на {r.hours} ч</p>
                <p className="mt-2 text-sm">{r.reason}</p>
                <RentButton id={r.id} name={r.name} disabled={r.hours < 1} />
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

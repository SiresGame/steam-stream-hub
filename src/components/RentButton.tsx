import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const errors: Record<string, string> = {
  insufficient_funds: "Недостаточно денег на балансе",
  user_blocked: "Ваш профиль заблокирован администратором",
  active_session: "У вас уже есть активная сессия — завершите её в профиле",
  not_available: "Этот компьютер сейчас занят",
  no_link: "Компьютер ещё не готов к аренде",
};
const steps = ["Подключение к серверу…", "Включение питания…", "Загрузка системы…", "Запуск игрового клиента…", "Готово!"];

export type Prepaid = { gameId: string; hours: number; total: number };

export function RentButton({ id, name, disabled, prepaid }: { id: string; name: string; disabled?: boolean; prepaid?: Prepaid | undefined }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function rent() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    const { data, error } = prepaid
      ? await supabase.rpc("start_rental_prepaid", { _computer_id: id, _game_id: prepaid.gameId, _hours: prepaid.hours })
      : await supabase.rpc("start_rental", { _computer_id: id });
    setBusy(false);
    if (error) { const k = Object.keys(errors).find((e) => error.message.includes(e)); toast.error(k ? errors[k] : "Не удалось арендовать"); return; }
    qc.invalidateQueries();
    const { data: sess } = await supabase.from("rental_sessions").select("id").eq("user_id", u.user.id).is("ended_at", null).maybeSingle();
    setUrl(sess?.id ?? (data as string));
  }

  return (
    <>
      <Button className="mt-3 h-10 w-full gap-2" disabled={disabled || busy} onClick={rent}><Power size={16} />{disabled ? "Занят" : busy ? "Проверка…" : prepaid ? `Арендовать на ${prepaid.hours} ч · ${prepaid.total} ₽` : "Арендовать"}</Button>
      {url && <LaunchOverlay name={name} url={url} onClose={() => setUrl(null)} onDone={() => navigate({ to: "/session/$id", params: { id: url } })} />}
    </>
  );
}

function LaunchOverlay({ name, url, onClose, onDone }: { name: string; url: string; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const done = step >= steps.length - 1;
  useEffect(() => {
    if (done) { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step, done, onDone]);
  const pct = Math.round((step / (steps.length - 1)) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background/95 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 launch-grid" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="absolute inset-3 animate-spin rounded-full border-4 border-primary/30 border-t-primary" style={{ animationDuration: "1.2s" }} />
          <span className="absolute inset-8 animate-spin rounded-full border-2 border-brand-blue/30 border-b-brand-blue" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
          <Power size={44} className={done ? "text-primary drop-shadow-[0_0_18px_currentColor]" : "animate-pulse text-primary"} />
        </div>
        <h2 className="mt-8 text-2xl font-bold">{name}</h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{steps[step]}</p>
        <div className="mt-6 h-2 w-72 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary shadow-[0_0_12px_var(--primary)] transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{pct}%</p>
        {done && <Button variant="ghost" className="mt-6" onClick={onClose}>Закрыть</Button>}
      </div>
    </div>
  );
}

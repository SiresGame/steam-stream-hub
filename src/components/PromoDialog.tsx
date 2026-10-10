import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { normalizePromoCode, useActivePromo } from "@/lib/promo";
import mascot from "@/assets/landing/mascot.webp.asset.json";
import wave from "@/assets/landing/wave.svg.asset.json";

export function PromoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const qc = useQueryClient();
  const active = useActivePromo();
  async function activate(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLogin(false); setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLogin(true); return; }
      const { data, error: err } = await supabase.rpc("redeem_promo", { _code: normalizePromoCode(code) });
      if (err) {
        setError(err.message.includes("promo_already_used") ? "Ты уже использовал этот промокод" : err.message.includes("promo_limit") ? "Лимит активаций исчерпан" : err.message.includes("invalid_promo") ? "Промокод не найден или срок действия истёк" : "Не удалось активировать. Попробуй ещё раз");
        return;
      }
      setSuccess(data); await qc.invalidateQueries({ queryKey: ["active-promo"] });
    } catch { setError("Не удалось подключиться. Попробуй ещё раз"); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) { setError(""); setLogin(false); setSuccess(null); } }}>
    <DialogContent className="fog-promo-dialog" style={{ backgroundImage: `url(${wave.url})` }}>
      <img src={mascot.url} alt="Робот Fog Play" className="fog-promo-mascot" />
      <div className="fog-promo-form">
        <DialogTitle className="fog-promo-title">{success !== null ? "Промокод активирован!" : "Твой промокод"}</DialogTitle>
        <DialogDescription className="fog-promo-subtitle">{success !== null ? `Скидка ${success}% на часы следующей игры` : "Активируй и играй со скидкой"}</DialogDescription>
        {success !== null ? <Button asChild className="fog-gradient-button mt-8 w-full"><Link to="/computer" onClick={() => onOpenChange(false)}>Выбрать игру</Link></Button> : <form onSubmit={activate} className="mt-5 grid gap-5">
          <Input aria-label="Промокод" value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} maxLength={40} required minLength={3} autoComplete="off" className="fog-promo-input" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {login && <p className="text-sm">Чтобы активировать промокод, <Link to="/auth" className="underline text-brand-blue">войти в профиль</Link></p>}
          <Button type="submit" className="fog-gradient-button" disabled={busy}>{busy ? "Проверяем…" : "Активировать"}</Button>
          {active.data && <p className="text-xs text-brand-blue">Активен {active.data.code}: −{active.data.discount_percent}% на следующую сессию</p>}
        </form>}
      </div>
    </DialogContent>
  </Dialog>;
}

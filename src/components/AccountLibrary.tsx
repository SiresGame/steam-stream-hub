import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AccountLibrary({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["library", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("game_accounts").select("id, login, password, note, sold_at, game:games(title, slug)").eq("sold_to", userId).order("sold_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <h2 className="mt-10 flex items-center gap-2 text-xl font-bold"><Library size={20} className="text-primary" />Библиотека купленных аккаунтов</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {q.isLoading && <p className="text-muted-foreground">Загрузка…</p>}
        {q.data && !q.data.length && <p className="text-muted-foreground">Пока пусто — купить аккаунт с игрой можно на странице игры.</p>}
        {q.data?.map((a) => <Item key={a.id} a={a} />)}
      </div>
    </>
  );
}

function Item({ a }: { a: { login: string; password: string; note: string; sold_at: string | null; game: { title: string } | null } }) {
  const [show, setShow] = useState(false);
  const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success("Скопировано"));
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">{a.game?.title ?? "Игра"}</h3>
      {a.sold_at && <p className="text-xs text-muted-foreground">Куплено {new Date(a.sold_at).toLocaleDateString("ru-RU")}</p>}
      <div className="mt-3 space-y-2 text-sm">
        <Row label="Логин" value={a.login} onCopy={() => copy(a.login)} />
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-muted-foreground">Пароль</span>
          <span className="truncate font-mono">{show ? a.password : "••••••••"}</span>
          <div className="flex">
            <Button size="icon" variant="ghost" aria-label={show ? "Скрыть" : "Показать"} onClick={() => setShow(!show)}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
            <Button size="icon" variant="ghost" aria-label="Копировать пароль" onClick={() => copy(a.password)}><Copy size={14} /></Button>
          </div>
        </div>
      </div>
      {a.note && <p className="mt-3 text-xs text-muted-foreground">{a.note}</p>}
    </article>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono">{value}</span>
      <Button size="icon" variant="ghost" aria-label={`Копировать ${label.toLowerCase()}`} onClick={onCopy}><Copy size={14} /></Button>
    </div>
  );
}

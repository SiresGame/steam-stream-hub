import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Вход — облачный гейминг" },
    { name: "description", content: "Вход и регистрация в сервисе облачного гейминга." },
    { property: "og:title", content: "Вход — облачный гейминг" },
    { property: "og:description", content: "Войдите, чтобы управлять каталогом игр." },
  ] }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email("Неверный email").max(255), password: z.string().min(6, "Минимум 6 символов").max(72) });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: f.get("email"), password: f.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true);
    const { email, password } = parsed.data;
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error("Неверный email или пароль"); return; }
      navigate({ to: "/profile" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth" } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Проверьте почту и подтвердите email");
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">{mode === "in" ? "Вход" : "Регистрация"}</h1>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" /></div>
        <div className="space-y-2"><Label htmlFor="password">Пароль</Label><Input id="password" name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
        <Button type="submit" disabled={busy} className="h-11 w-full">{mode === "in" ? "Войти" : "Создать аккаунт"}</Button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground">{mode === "in" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}</button>
      </form>
    </main>
  );
}

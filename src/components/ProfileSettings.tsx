import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, KeyRound, Mail, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type P = { display_name: string; avatar_url: string; bio: string; favorite_genres: string[] };

export function UserAvatar({ url, name, size = 80 }: { url?: string | undefined; name: string; size?: number }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return url
    ? <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-2xl object-cover ring-2 ring-primary/40" />
    : <div style={{ width: size, height: size, fontSize: size / 2.5 }} className="flex items-center justify-center rounded-2xl bg-primary/20 font-black text-primary ring-2 ring-primary/40">{letter}</div>;
}

export function ProfileSettings({ userId, email, profile, genres }: { userId: string; email: string; profile: P | undefined; genres: string[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<P>({ display_name: "", avatar_url: "", bio: "", favorite_genres: [] });
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (profile) setForm({ display_name: profile.display_name ?? "", avatar_url: profile.avatar_url ?? "", bio: profile.bio ?? "", favorite_genres: profile.favorite_genres ?? [] }); }, [profile]);

  async function save(next = form) {
    setBusy(true);
    const { error } = await supabase.rpc("update_my_profile", { _display_name: next.display_name, _avatar_url: next.avatar_url, _bio: next.bio, _favorite_genres: next.favorite_genres });
    setBusy(false);
    if (error) { toast.error("Не удалось сохранить"); return; }
    toast.success("Профиль сохранён"); qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function upload(f: File) {
    if (!f.type.startsWith("image/")) { toast.error("Нужна картинка"); return; }
    if (f.size > 3 * 1024 * 1024) { toast.error("Файл больше 3 МБ"); return; }
    setBusy(true);
    const path = `${userId}/avatar-${Date.now()}.${f.name.split(".").pop() || "png"}`;
    const up = await supabase.storage.from("avatars").upload(path, f, { upsert: true, contentType: f.type });
    if (up.error) { setBusy(false); toast.error("Не удалось загрузить"); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setBusy(false);
    if (!data?.signedUrl) return;
    const next = { ...form, avatar_url: data.signedUrl };
    setForm(next); await save(next);
  }

  const toggle = (g: string) => setForm((f) => ({ ...f, favorite_genres: f.favorite_genres.includes(g) ? f.favorite_genres.filter((x) => x !== g) : [...f.favorite_genres, g] }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">Основное</h3>
        <div className="mt-4 flex items-center gap-4">
          <UserAvatar url={form.avatar_url} name={form.display_name || email} />
          <div className="flex flex-col gap-2">
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            <Button size="sm" variant="secondary" className="gap-2" disabled={busy} onClick={() => file.current?.click()}><Camera size={14} />Загрузить аватар</Button>
            {form.avatar_url && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { const n = { ...form, avatar_url: "" }; setForm(n); save(n); }}>Убрать</Button>}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div><Label>Никнейм</Label><Input maxLength={40} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Как тебя называть" /></div>
          <div><Label>О себе</Label><Textarea maxLength={300} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Во что любишь играть?" /></div>
          <div>
            <Label>Любимые жанры</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map((g) => <button key={g} type="button" onClick={() => toggle(g)} className={`rounded-full border px-3 py-1 text-xs transition ${form.favorite_genres.includes(g) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>{g}</button>)}
            </div>
          </div>
          <Button className="gap-2" disabled={busy} onClick={() => save()}><Save size={16} />Сохранить</Button>
        </div>
      </section>
      <div className="space-y-6">
        <PasswordForm />
        <EmailForm email={email} />
      </div>
    </div>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState(""); const [p1, setP1] = useState(""); const [p2, setP2] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    if (p1.length < 8) { toast.error("Новый пароль — минимум 8 символов"); return; }
    if (p1 !== p2) { toast.error("Пароли не совпадают"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1, current_password: cur } as Parameters<typeof supabase.auth.updateUser>[0]);
    setBusy(false);
    if (error) { toast.error(/current|invalid/i.test(error.message) ? "Неверный текущий пароль" : /weak|pwned|leak/i.test(error.message) ? "Пароль слишком простой" : "Не удалось сменить пароль"); return; }
    toast.success("Пароль изменён"); setCur(""); setP1(""); setP2("");
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-bold"><KeyRound size={16} className="text-primary" />Смена пароля</h3>
      <div className="mt-4 space-y-3">
        <Input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Текущий пароль" />
        <Input type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} placeholder="Новый пароль (от 8 символов)" />
        <Input type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} placeholder="Повтори новый пароль" />
        <Button disabled={busy || !cur || !p1} onClick={submit}>{busy ? "Меняем…" : "Сменить пароль"}</Button>
      </div>
    </section>
  );
}

function EmailForm({ email }: { email: string }) {
  const [v, setV] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(v)) { toast.error("Неверный email"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: v }, { emailRedirectTo: `${window.location.origin}/auth` });
    setBusy(false);
    if (error) { toast.error("Не удалось сменить почту"); return; }
    toast.success("Проверь новую почту и подтверди смену"); setV("");
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-bold"><Mail size={16} className="text-primary" />Почта</h3>
      <p className="mt-1 text-sm text-muted-foreground">Сейчас: {email}</p>
      <div className="mt-3 flex gap-2"><Input type="email" value={v} onChange={(e) => setV(e.target.value)} placeholder="Новая почта" /><Button variant="secondary" disabled={busy} onClick={submit}>Сменить</Button></div>
    </section>
  );
}

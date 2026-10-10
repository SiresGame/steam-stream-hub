import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const fetchSteamGame = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => z.object({ url: z.string().max(500) }).parse(d))
  .handler(async ({ data }) => {
    const m = data.url.match(/store\.steampowered\.com\/app\/(\d+)/) ?? data.url.match(/^(\d+)$/);
    if (!m) throw new Error("Нужна ссылка вида store.steampowered.com/app/12345");
    const id = m[1]!;
    const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&l=russian&cc=ru`);
    const j = (await r.json()) as Record<string, { success: boolean; data?: any }>;
    const g = j[id];
    if (!g?.success || !g.data) throw new Error("Игра в Steam не найдена");
    const d = g.data;
    const year = Number(String(d.release_date?.date ?? "").match(/\d{4}/)?.[0]) || null;
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
    return {
      title: String(d.name ?? ""),
      image_url: String(d.header_image ?? "").split("?")[0] ?? "",
      about: strip(String(d.short_description ?? "")).slice(0, 3000),
      developer: String((d.developers ?? [])[0] ?? "").slice(0, 120),
      year,
    };
  });

function reqText(h: unknown) {
  if (typeof h !== "string" || !h) return "";
  return h.replace(/<br\s*\/?>|<\/li>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .split("\n").map((l) => l.trim())
    .filter((l) => l.includes(":") && !/^(Минимальные|Рекоменд|Minimum|Recommended|Дополнительно|Звуковая|Additional|Sound)/i.test(l))
    .map((l) => l.slice(0, 160)).join("\n").slice(0, 1200);
}

/** Admin: fills description, studio, year and system requirements from Steam for games missing them (batch). */
export const syncSteamDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: games } = await context.supabase.from("games").select("id, image_url, steam_appid").eq("requirements_min", "").limit(200);
    const todo = (games ?? []).map((g) => ({ id: g.id, appid: g.steam_appid ?? Number(g.image_url?.match(/\/apps\/(\d+)\//)?.[1]) })).filter((g) => g.appid);
    let updated = 0;
    for (const g of todo.slice(0, 12)) {
      let d: any = null;
      for (const cc of ["ru", "us"]) {
        const j = (await (await fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&l=russian&cc=${cc}`)).json().catch(() => null)) as Record<string, { success: boolean; data?: any }> | null;
        if (j?.[g.appid]?.success) { d = j[g.appid]!.data; break; }
      }
      if (!d) continue;
      const pr = d.pc_requirements && !Array.isArray(d.pc_requirements) ? d.pc_requirements : {};
      const year = Number(String(d.release_date?.date ?? "").match(/(19|20)\d\d/)?.[0]) || null;
      const { error } = await context.supabase.from("games").update({
        steam_appid: g.appid,
        about: String(d.short_description ?? "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').slice(0, 1000),
        developer: String((d.developers ?? []).join(", ")).slice(0, 120),
        year,
        requirements_min: reqText(pr.minimum) || "—",
        requirements_rec: reqText(pr.recommended),
      }).eq("id", g.id);
      if (!error) updated++;
    }
    return { updated, remaining: Math.max(0, todo.length - 12) };
  });

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
  });
}
const cols = "id, slug, title, image_url, about, developer, year, requirements_min, requirements_rec, price, cloud_saves, label, discount_percent, category:categories(name, slug)";

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [g, c, pc, b] = await Promise.all([
    sb.from("games").select(cols).eq("published", true).order("created_at"),
    sb.from("categories").select("id, name, slug").order("sort_order"),
    sb.from("computers").select("id, name, cpu, gpu, ram_gb, city, price, available").eq("blocked", false).order("price"),
    sb.from("banners").select("id, title, description, image_url, link_url").eq("published", true).order("sort_order"),
  ]);
  if (g.error) throw new Error("Не удалось загрузить игры");
  return { games: g.data ?? [], categories: c.data ?? [], computers: pc.data ?? [], banners: b.data ?? [] };
});

export const getGameBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 200) }))
  .handler(async ({ data }) => {
    const { data: game } = await publicClient().from("games").select(cols).eq("slug", data.slug).eq("published", true).maybeSingle();
    return game;
  });

export const listGameComputers = createServerFn({ method: "GET" })
  .inputValidator((d: { gameId: string }) => ({ gameId: String(d.gameId).slice(0, 64) }))
  .handler(async ({ data }) => {
    const { data: rows } = await publicClient().from("computer_games").select("computer:computers(id, name, cpu, gpu, ram_gb, city, price, available, blocked)").eq("game_id", data.gameId);
    return (rows ?? []).map((r) => r.computer).filter((c): c is NonNullable<typeof c> => !!c && !c.blocked);
  });

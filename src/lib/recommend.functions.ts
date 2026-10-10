import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Recommendation = { id: string; name: string; price: number; hours: number; reason: string };

export const recommendPCs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => {
    const q = String(d?.query ?? "").trim();
    if (q.length < 3 || q.length > 500) throw new Error("Опишите запрос (3–500 символов)");
    return { query: q };
  })
  .handler(async ({ data, context }) => {
    const [{ data: profile }, { data: pcs }] = await Promise.all([
      context.supabase.rpc("my_profile"),
      context.supabase.from("computers").select("id, name, cpu, gpu, ram_gb, city, price").eq("available", true),
    ]);
    const balance = profile?.balance ?? 0;
    const list = pcs ?? [];
    if (!list.length) return { summary: "Сейчас нет свободных компьютеров.", balance, items: [] as Recommendation[] };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI не настроен");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      system: "Ты помощник сервиса аренды игровых ПК. Подбирай компьютеры только из переданного списка. Учитывай игру, желаемое качество/FPS и баланс игрока (цена за час, первый час списывается сразу; ПК дороже баланса не рекомендуй как доступный). Ответь ТОЛЬКО JSON без markdown: {\"summary\": string, \"items\": [{\"id\": string, \"reason\": string}]} — до 3 ПК, лучшие первыми, причины кратко по-русски.",
      prompt: `Баланс игрока: ${balance} ₽.\nСвободные ПК: ${JSON.stringify(list)}\nЗапрос игрока: ${data.query}`,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    let text: string;
    try { text = await result.text; } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 429) throw new Error("Слишком много запросов, попробуйте позже");
      if (status === 402) throw new Error("Закончились AI-кредиты сервиса");
      throw new Error("Не удалось получить рекомендацию");
    }
    const m = text.match(/\{[\s\S]*\}/);
    let parsed: { summary?: string; items?: { id: string; reason: string }[] } = {};
    try { parsed = JSON.parse(m?.[0] ?? "{}"); } catch { /* ignore */ }
    const items: Recommendation[] = (parsed.items ?? []).flatMap((it) => {
      const pc = list.find((p) => p.id === it.id);
      return pc ? [{ id: pc.id, name: pc.name, price: pc.price, hours: pc.price ? Math.floor(balance / pc.price) : 0, reason: String(it.reason ?? "") }] : [];
    }).slice(0, 3);
    return { summary: parsed.summary ?? "", balance, items };
  });

export type GameRecommendation = { id: string; slug: string; title: string; image_url: string | null; price: number; discount_percent: number; total: number; reason: string };

export const recommendGames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { genres: string[]; favorites: string; hours: number }) => {
    const genres = (Array.isArray(d?.genres) ? d.genres : []).map((g) => String(g).slice(0, 60)).slice(0, 10);
    const favorites = String(d?.favorites ?? "").trim().slice(0, 300);
    const hours = Math.min(12, Math.max(1, Math.round(Number(d?.hours) || 1)));
    return { genres, favorites, hours };
  })
  .handler(async ({ data, context }) => {
    const [{ data: profile }, { data: games }, { data: steam }, { data: owned }] = await Promise.all([
      context.supabase.rpc("my_profile"),
      context.supabase.from("games").select("id, slug, title, image_url, about, price, discount_percent, category:categories(name)").eq("published", true),
      context.supabase.from("steam_links").select("games, top_genres").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("game_accounts").select("game:games(title)").eq("sold_to", context.userId),
    ]);
    const steamTop = ((steam?.games ?? []) as { name: string; hours: number }[]).slice(0, 15).map((g) => `${g.name} (${g.hours} ч)`);
    const library = (owned ?? []).map((o) => o.game?.title).filter(Boolean);
    const balance = profile?.balance ?? 0;
    const list = games ?? [];
    if (!list.length) return { summary: "Каталог пока пуст.", balance, items: [] as GameRecommendation[] };
    const rate = (g: { price: number; discount_percent: number }) => Math.round(g.price * (100 - g.discount_percent) / 100);
    const compact = list.map((g) => ({ id: g.id, t: g.title, g: g.category?.name ?? "", p: rate(g), a: g.about.slice(0, 140) }));

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI не настроен");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      system: "Ты помощник сервиса облачного гейминга. Подбирай игры ТОЛЬКО из переданного каталога (по id). Учитывай любимые жанры, похожесть на любимые игры игрока (не рекомендуй сами любимые игры, если их можно заменить похожими), желаемую длительность сессии (короткие сессии — матчевые/рогалики/казуальные, длинные — RPG и открытые миры) и баланс (p — цена за час; стоимость = p × часы). Ответь ТОЛЬКО JSON без markdown: {\"summary\": string, \"items\": [{\"id\": string, \"reason\": string}]} — 4–6 игр, лучшие первыми, причина — одно короткое предложение по-русски.",
      prompt: `Любимые жанры: ${data.genres.join(", ") || "не указаны"}\nЛюбимые игры: ${data.favorites || "не указаны"}\nСамые играемые в Steam: ${steamTop.join(", ") || "Steam не привязан"}\nЖанры из Steam: ${(steam?.top_genres ?? []).join(", ") || "—"}\nУже куплено в библиотеке: ${library.join(", ") || "—"}\nДлительность сессии: ${data.hours} ч\nБаланс: ${balance} ₽\nКаталог: ${JSON.stringify(compact)}`,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    let text: string;
    try { text = await result.text; } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 429) throw new Error("Слишком много запросов, попробуйте позже");
      if (status === 402) throw new Error("Закончились AI-кредиты сервиса");
      throw new Error("Не удалось получить рекомендацию");
    }
    let parsed: { summary?: string; items?: { id: string; reason: string }[] } = {};
    try { parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { /* ignore */ }
    const items: GameRecommendation[] = (parsed.items ?? []).flatMap((it) => {
      const g = list.find((x) => x.id === it.id);
      return g ? [{ id: g.id, slug: g.slug, title: g.title, image_url: g.image_url, price: g.price, discount_percent: g.discount_percent, total: rate(g) * data.hours, reason: String(it.reason ?? "") }] : [];
    }).slice(0, 6);
    return { summary: parsed.summary ?? "", balance, items };
  });

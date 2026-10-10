import { createFileRoute } from "@tanstack/react-router";

const norm = (s: string) => s.toLowerCase().replace(/[™®©]/g, "").replace(/[^a-zа-я0-9]+/g, " ").trim();

export const Route = createFileRoute("/api/public/steam/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const back = (q: string) => Response.redirect(`${url.origin}/profile?steam=${q}`, 302);
        const { verifyState } = await import("@/lib/steam-sign.server");
        const userId = await verifyState(url.searchParams.get("state") ?? "");
        if (!userId) return back("expired");

        // Verify the OpenID assertion with Steam itself.
        const check = new URLSearchParams();
        url.searchParams.forEach((v, k) => { if (k.startsWith("openid.")) check.set(k, v); });
        check.set("openid.mode", "check_authentication");
        const vr = await fetch("https://steamcommunity.com/openid/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: check });
        if (!(await vr.text()).includes("is_valid:true")) return back("invalid");
        const steamId = url.searchParams.get("openid.claimed_id")?.match(/\/openid\/id\/(\d{17})$/)?.[1];
        if (!steamId) return back("invalid");

        const key = process.env["STEAM_API_KEY"];
        let persona = "", avatar = "";
        let games: { appid: number; name: string; hours: number }[] = [];
        if (key) {
          try {
            const [s, g] = await Promise.all([
              fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`).then((r) => r.json()) as Promise<{ response?: { players?: { personaname?: string; avatarfull?: string }[] } }>,
              fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`).then((r) => r.json()) as Promise<{ response?: { games?: { appid: number; name: string; playtime_forever: number }[] } }>,
            ]);
            persona = s.response?.players?.[0]?.personaname ?? "";
            avatar = s.response?.players?.[0]?.avatarfull ?? "";
            games = (g.response?.games ?? []).sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 200).map((x) => ({ appid: x.appid, name: x.name, hours: Math.round(x.playtime_forever / 60) }));
          } catch { /* keep link even if Steam API fails */ }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: catalog } = await supabaseAdmin.from("games").select("title, category:categories(name)").eq("published", true);
        const genreScore = new Map<string, number>();
        for (const g of games.slice(0, 50)) {
          const m = (catalog ?? []).find((c) => norm(c.title) === norm(g.name));
          const genre = m?.category?.name;
          if (genre) genreScore.set(genre, (genreScore.get(genre) ?? 0) + Math.max(1, g.hours));
        }
        const topGenres = [...genreScore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
        await supabaseAdmin.from("steam_links").upsert({ user_id: userId, steam_id: steamId, persona, avatar_url: avatar, games, top_genres: topGenres, updated_at: new Date().toISOString() });
        return back("ok");
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Returns the Steam sign-in URL that links Steam to the current account. */
export const startSteamLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { origin: string }) => {
    const u = new URL(String(d?.origin ?? ""));
    if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error("Bad origin");
    return { origin: u.origin };
  })
  .handler(async ({ data, context }) => {
    const { signState } = await import("./steam-sign.server");
    const state = await signState(context.userId);
    const returnTo = `${data.origin}/api/public/steam/callback?state=${encodeURIComponent(state)}`;
    const p = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": returnTo,
      "openid.realm": data.origin,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });
    return { url: `https://steamcommunity.com/openid/login?${p}` };
  });

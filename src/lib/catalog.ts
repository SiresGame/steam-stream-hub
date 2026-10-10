import { queryOptions } from "@tanstack/react-query";
import { listCatalog, getGameBySlug } from "./catalog.functions";
import genshin from "@/assets/fogplay/genshin.webp";
import mortalShell from "@/assets/fogplay/mortal-shell.webp";
import forza from "@/assets/fogplay/forza.webp";
import crimsonDesert from "@/assets/fogplay/crimson-desert.webp";
import kingdomCome from "@/assets/fogplay/kingdom-come.webp";
import cyberpunk from "@/assets/fogplay/cyberpunk.webp";
import rdr2 from "@/assets/fogplay/rdr2.webp";
import dota2 from "@/assets/fogplay/dota2.webp";

const local: Record<string, string> = { "genshin-impact": genshin, "mortal-shell-2": mortalShell, "forza-horizon-6": forza, "crimson-desert": crimsonDesert, "kingdom-come-deliverance-2": kingdomCome, "cyberpunk-2077": cyberpunk, "red-dead-redemption-2": rdr2, "dota-2": dota2 };
export const coverOf = (g: { slug: string; image_url: string | null }) => g.image_url || local[g.slug] || cyberpunk;

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => listCatalog() });
export const gameQuery = (slug: string) => queryOptions({ queryKey: ["game", slug], queryFn: () => getGameBySlug({ data: { slug } }) });
export type CatalogGame = Awaited<ReturnType<typeof listCatalog>>["games"][number];
/** Цена за час с учётом скидки игры. */
export const effectivePrice = (g: { price: number; discount_percent?: number | null }) => Math.round(g.price * (100 - (g.discount_percent ?? 0)) / 100);

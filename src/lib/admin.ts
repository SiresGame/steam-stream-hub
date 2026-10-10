import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const adminGamesQuery = queryOptions({ queryKey: ["admin", "games"], queryFn: async () => {
  const { data, error } = await supabase.from("games").select("*, category:categories(name)").order("created_at", { ascending: false });
  if (error) throw error; return data;
} });
export const adminCategoriesQuery = queryOptions({ queryKey: ["admin", "categories"], queryFn: async () => {
  const { data, error } = await supabase.from("categories").select("*, games(count)").order("sort_order");
  if (error) throw error; return data;
} });
export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "");
export const adminComputersQuery = queryOptions({ queryKey: ["admin", "computers"], queryFn: async () => {
  const { data, error } = await supabase.from("computers").select("*").order("created_at");
  if (error) throw error; return data;
} });

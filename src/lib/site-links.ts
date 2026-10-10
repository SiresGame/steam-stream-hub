import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Placement = "header" | "footer" | "profile";
export type SiteLink = { id: string; placement: string; label: string; url: string; content: string; sort_order: number; published: boolean };

export const siteLinksQuery = queryOptions({
  queryKey: ["site-links"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_links").select("*").eq("published", true).order("sort_order");
    if (error) throw error;
    return data as SiteLink[];
  },
});

export const adminSiteLinksQuery = queryOptions({
  queryKey: ["admin", "site-links"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_links").select("*").order("placement").order("sort_order");
    if (error) throw error;
    return data as SiteLink[];
  },
});

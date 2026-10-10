import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteLinkItem({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  if (url.startsWith("/")) return <Link to={url as "/"} className={className}>{children}</Link>;
  const ext = /^https?:/.test(url);
  return <a href={url} className={className} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
}

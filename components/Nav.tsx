"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: number };

export function Nav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-white text-brand" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
            {item.badge ? (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-ink">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

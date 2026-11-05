"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: number };

export function Nav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="nav-shell">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="nav-pill"
          >
            {item.label}
            {item.badge ? (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-[#1f2937]">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

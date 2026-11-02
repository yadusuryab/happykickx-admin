"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  Grid,
  MoreHorizontal,
  Package,
  Settings,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Products", icon: Package },
  // { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: Grid },
  { href: "/admin/brands", label: "Brands", icon: Folder },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// First 4 sit in the phone bar. The rest live in the "More" sheet.
// Desktop shows all of them inline.
const PRIMARY = 4;

export function AdminNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);
  const overflow = navItems.slice(PRIMARY);
  const overflowActive = overflow.some((n) => isActive(n.href));

  // Close on navigation and on Escape.
  useEffect(() => setMore(false), [pathname]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  const tab =
    "group flex w-full flex-col items-center gap-1 py-3 text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 md:flex-row md:gap-2 md:py-4 md:text-[11px]";
  const bar =
    "absolute left-1/2 top-0 h-0.5 -translate-x-1/2 bg-secondary transition-all duration-500 ease-out md:bottom-0 md:top-auto";

  return (
    <>
      {/* Backdrop. Sibling of <nav> because backdrop-blur traps fixed children. */}
      {more && (
        <button
          aria-label="Close menu"
          onClick={() => setMore(false)}
          className="fixed inset-0 z-40 bg-black/40 animate-in fade-in md:hidden"
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-primary/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:sticky md:inset-x-auto md:top-0 md:border-b md:border-t-0 md:pb-0">
        {/* More sheet. Sits right above the bar. Phones only. */}
        {more && (
          <div className="absolute inset-x-0 bottom-full border-t border-white/10 bg-primary px-4 pb-3 pt-2 animate-in slide-in-from-bottom-4 fade-in md:hidden">
            <ul className="mx-auto max-w-3xl divide-y divide-white/10">
              {overflow.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-4 py-4 text-sm font-bold tracking-tight ${
                      isActive(href) ? "text-secondary" : "text-white/70"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive(href) ? 2.5 : 1.75} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mx-auto grid max-w-3xl grid-cols-5 md:flex md:justify-center md:gap-10">
          {navItems.map(({ href, label, icon: Icon }, i) => {
            const active = isActive(href);
            return (
              <li
                key={href}
                className={`relative ${i >= PRIMARY ? "hidden md:block" : ""}`}
              >
                <Link
                  href={href}
                  className={`${tab} ${
                    active ? "text-white" : "text-white/40 hover:text-white"
                  }`}
                >
                  <span className="hidden text-secondary md:inline">0{i + 1}</span>
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 md:hidden ${
                      active ? "-translate-y-0.5 text-secondary" : "group-active:scale-90"
                    }`}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  <span>{label}</span>
                  <span
                    className={`${bar} ${
                      active ? "w-8 md:w-full" : "w-0 group-hover:w-4 md:group-hover:w-full"
                    }`}
                  />
                </Link>
              </li>
            );
          })}

          {/* More tab. Phones only. */}
          <li className="relative md:hidden">
            <button
              type="button"
              aria-expanded={more}
              onClick={() => setMore((v) => !v)}
              className={`${tab} ${
                more || overflowActive ? "text-white" : "text-white/40"
              }`}
            >
              {more ? (
                <X className="h-5 w-5 text-secondary" strokeWidth={2.5} />
              ) : (
                <MoreHorizontal
                  className={`h-5 w-5 ${overflowActive ? "-translate-y-0.5 text-secondary" : ""}`}
                  strokeWidth={overflowActive ? 2.5 : 1.75}
                />
              )}
              <span>More</span>
              <span className={`${bar} ${overflowActive ? "w-8" : "w-0"}`} />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
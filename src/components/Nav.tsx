"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Register" },
  { href: "/players", label: "Players" },
  { href: "/bracket", label: "Bracket" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav-shell anim-fade sticky top-0 z-40 border-b border-val-navy-light/60 bg-val-darker/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <Link href="/" className="press group flex min-w-0 items-center gap-3" aria-label="Valorant 2v2 home">
          <div className="relative h-9 w-9 overflow-hidden rounded-md border border-val-red/60 bg-val-darker shadow-[0_0_12px_rgba(255,70,85,0.4)] transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/valorant-logo.png"
              alt="Valorant Logo"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <span className="heading truncate text-base text-val-light sm:text-xl">
            Valorant <span className="text-val-red">2v2</span>
          </span>
        </Link>
        <ul className="nav-links flex items-center gap-0.5 sm:gap-1">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className={`link-underline press heading rounded px-2.5 py-2 text-[10px] transition-colors duration-200 hover:bg-val-navy hover:text-val-light sm:px-3 sm:text-xs ${
                    active ? "text-val-light" : "text-val-muted"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

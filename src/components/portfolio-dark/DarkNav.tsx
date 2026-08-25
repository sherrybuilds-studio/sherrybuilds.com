"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";

const LINKS = [
  { label: "Demo", href: "#demo" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const cyanPill: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0.10))",
  border: "1px solid rgba(34, 211, 238, 0.40)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
  color: "var(--text)",
};

export default function DarkNav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Escape to close + lock body scroll while the menu is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Animated open/close in the site's motion language. The menu stays
  // mounted (so close animates too); autoAlpha keeps it non-focusable when
  // shut. Reduced motion: instant show/hide, no slide/stagger.
  useGSAP(
    () => {
      const menu = menuRef.current;
      if (!menu) return;
      const items = menu.querySelectorAll<HTMLElement>(".dnav-item");
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          gsap.set(menu, { autoAlpha: 1, pointerEvents: "auto" });
          gsap.fromTo(
            menu,
            { clipPath: "inset(0% 0% 100% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, ease: EASE }
          );
          gsap.fromTo(
            items,
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.45, ease: EASE, stagger: 0.07, delay: 0.12 }
          );
        } else {
          gsap.to(menu, {
            autoAlpha: 0,
            duration: 0.3,
            ease: EASE,
            onComplete: () => gsap.set(menu, { pointerEvents: "none" }),
          });
        }
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(menu, {
          autoAlpha: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          clipPath: "none",
        });
        gsap.set(items, { autoAlpha: 1, y: 0 });
      });
    },
    { dependencies: [open] }
  );

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50"
        style={{
          background: "rgba(10, 14, 26, 0.55)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          backdropFilter: "blur(20px) saturate(140%)",
          borderBottom: "1px solid var(--glass-border)",
        }}
      >
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-[80rem] items-center justify-between px-6 lg:px-10"
        style={{ height: "var(--nav-height)" }}
      >
        <Link
          href="/"
          className="relative z-[60] text-[1.3rem] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 560, color: "var(--text)" }}
        >
          sherrybuilds<span style={{ color: "var(--accent)" }}>.</span>
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="pf-underline text-[0.9rem]"
                style={{ color: "var(--muted)" }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="pf-btn hidden items-center rounded-full px-5 text-[0.875rem] font-medium md:inline-flex"
            style={{ ...cyanPill, height: "2.75rem" }}
          >
            Get in touch
          </a>

          {/* Hamburger — 44px target, animates to an X when open */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="relative z-[60] flex h-11 w-11 items-center justify-center md:hidden"
            style={{ color: "var(--text)" }}
          >
            <span className="relative block h-3 w-6" aria-hidden="true">
              <span
                className="absolute left-0 top-0 h-px w-full bg-current"
                style={{
                  transition: "transform var(--dur-ui) var(--ease)",
                  transform: open ? "translateY(5.5px) rotate(45deg)" : "none",
                }}
              />
              <span
                className="absolute bottom-0 left-0 h-px w-full bg-current"
                style={{
                  transition: "transform var(--dur-ui) var(--ease)",
                  transform: open ? "translateY(-5.5px) rotate(-45deg)" : "none",
                }}
              />
            </span>
          </button>
        </div>
        </nav>
      </header>

      {/* Mobile menu — glass full-height sheet. MUST be a sibling of <header>,
          NOT a child: the header's backdrop-filter establishes a containing
          block that would trap this fixed element inside the 72px bar instead
          of the viewport. z-45 sits above the page (main z-1) but below the
          header bar (z-50) so the hamburger stays tappable to close. Always
          mounted; GSAP-driven so close animates too. */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className="fixed inset-0 z-[45] flex flex-col px-6 pb-12 pt-[calc(var(--nav-height)+var(--space-8))] md:hidden"
        style={{
          background: "rgba(9, 13, 24, 0.92)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          backdropFilter: "blur(24px) saturate(140%)",
          visibility: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <ul className="flex flex-col">
          {LINKS.map((l) => (
            <li key={l.href} className="dnav-item border-b" style={{ borderColor: "var(--glass-border)" }}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[3.5rem] items-center py-4 text-[2rem] tracking-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contact"
          onClick={() => setOpen(false)}
          className="dnav-item pf-btn mt-[var(--space-8)] inline-flex min-h-[3rem] w-full items-center justify-center rounded-full px-7 text-[1rem] font-medium"
          style={cyanPill}
        >
          Get in touch
        </a>
      </div>
    </>
  );
}

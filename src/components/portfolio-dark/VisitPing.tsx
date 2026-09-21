"use client";

import { useEffect } from "react";

// One fire-and-forget page-view beacon per page load → /api/visit →
// Supabase page_visits. Renders nothing, stores nothing in the browser
// (no cookies/localStorage), and only records on the real domain so dev
// servers, tunnels and screenshot runs never pollute the numbers.
const RECORD_HOSTS = new Set(["sherrybuilds.com", "www.sherrybuilds.com"]);

export default function VisitPing() {
  useEffect(() => {
    if (!RECORD_HOSTS.has(window.location.hostname)) return;
    const body = JSON.stringify({
      path: window.location.pathname,
      referrer: document.referrer || undefined,
    });
    // sendBeacon survives tab closes; fall back to keepalive fetch
    if (!navigator.sendBeacon?.("/api/visit", body)) {
      fetch("/api/visit", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, []);

  return null;
}

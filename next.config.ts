import type { NextConfig } from "next";
// ── Sentry plugin wraps the Next.js config for automatic error reporting ──
// ESM import, not require(): the CI lint gate rejects require()-style imports,
// and next.config.ts is transpiled, so a normal import works here.
import { withSentryConfig } from "@sentry/nextjs";

// ── Deployment contract — keep this in lockstep with ecosystem.config.js ──────
//
// This app is served by PM2 running `next start` (the classic Next.js server),
// NOT the standalone server. Do NOT add `output: "standalone"` here on its own:
// standalone emits `.next/standalone/server.js` instead of a `next start`-servable
// build, and the 2026-06-12 EADDRINUSE restart loop ("sherrybuilds-portfolio:
// 187 restarts") was exactly that mismatch — PM2 launching a standalone server
// the build never produced, crash-looping and orphaning a next-server on :3000.
//
// If you ever switch to standalone output, you MUST also switch
// ecosystem.config.js to run `node .next/standalone/server.js` and copy
// `public/` + `.next/static/` into the standalone dir at build time. Change both
// files in the same commit, or neither.
const nextConfig: NextConfig = {
  output: undefined, // explicit: classic `next start` server (paired with PM2)
  // Dev-only: allow browsing the dev server via the Tailscale IP — without
  // this, Next blocks cross-origin /_next/* assets, JS never runs, and every
  // GSAP-revealed element stays visibility:hidden (blank hero).
  allowedDevOrigins: ["100.78.223.103", "*.trycloudflare.com", "srv1467708.tailbf4b77.ts.net"],
  // Don't advertise the framework version.
  poweredByHeader: false,
  // Baseline security headers. Cloudflare fronts the site but sets none of
  // these itself (checked 2026-08-28), so the origin has to.
  // No CSP yet: GSAP/three/Spline/Sentry need a nonce-based policy — land
  // that separately in report-only mode first.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing on the site is meant to be framed; this stops clickjacking
          // of the /login form and the dashboard.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Browsers only honour HSTS over HTTPS, so this is inert on the
          // loopback/dev listeners and active at sherrybuilds.com.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "sherrybuilds",
  project: "sherrybuilds-os",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  disableLogger: true,
});

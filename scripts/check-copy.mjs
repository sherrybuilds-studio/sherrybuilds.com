#!/usr/bin/env node
// check-copy.mjs — the honesty ban-list over what a visitor actually reads.
//
// Runs after `next build`: reads the prerendered home page (visible text plus
// every <title>/<meta> content) and the text drawn into the Open Graph image,
// and fails on any claim the Verified-Metrics register bans. Source-level
// scans are useless here (CSS "55%", the "use client" directive), so this
// checks rendered words only. Same list as sherryos apps/job-hunter/honesty.py (minus Langfuse,
// which Sherry is re-enabling — 2026-09-26),
// plus the site rules: no slashes in prose (URLs and paths excepted) and no
// Werkstudent framing (2026-09-26).
//
//   node scripts/check-copy.mjs            # after `npm run build`
import { readFileSync } from "node:fs";

const BANNED = [
  [/\bclients?\b/i, "the word client — the family deployments are unpaid"],
  [/\b43 (?:real )?calls\b/i, "43 calls — purged"],
  [/94\.2/, "94.2% — never a CI result"],
  [/\b55\s?%\s*(?:→|->|regression)|55% of runs/i, "55% → 0% — not supported by the DB"],
  [/\b17 (?:enabled )?agents\b/i, "17 agents — stale; say 36 enabled"],
  [/\b278\b/, "278 scraped — stale"],
  [/\buptime\b|UptimeRobot/i, "uptime claims"],
  [/\bMuhammad\b/, "old name"],
  [/\b24\/7\b/, "24/7 — uptime claim"],
  [/captures every lead/i, "absolute claim"],
  [/\bfull-time\b/i, "full-time"],
  [/shehryarmughal30|codewithsherry/i, "old e-mail address"],
  [/\bWerkstudent\b/i, "Werkstudent framing — use the availability line"],
  [/\b1,?002\b/, "1,002 runs — corrected to 1,000"],
];

const htmlPath = process.argv[2] ?? ".next/server/app/index.html";
const html = readFileSync(htmlPath, "utf8");
const meta = [...html.matchAll(/<title>([^<]*)<\/title>|<meta[^>]+content="([^"]*)"/g)].map((m) => m[1] ?? m[2]);
const visible = html
  .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, "\n")
  .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const og = readFileSync("src/app/opengraph-image.tsx", "utf8").match(/>([^<>{}]+)</g)?.map((s) => s.slice(1, -1)) ?? [];

const texts = [
  ...visible.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).map((t) => ["page", t]),
  ...meta.filter(Boolean).map((t) => ["meta", t]),
  ...og.map((s) => s.trim()).filter(Boolean).map((t) => ["og-image", t]),
];
const URL_OR_PATH = /(?:https?:\/\/|www\.)\S+|\b[\w.-]+\.(?:com|de|io|ai|dev)(?:\/\S*)?|(?:^|\s)\/[\w./-]+/g;

const hits = [];
for (const [where, text] of texts) {
  for (const [re, why] of BANNED) if (re.test(text)) hits.push(`${where}: ${why} — "${text.slice(0, 120)}"`);
  if (where !== "meta" && text.replace(URL_OR_PATH, "").includes("/")) hits.push(`${where}: slash in prose — "${text.slice(0, 120)}"`);
}
if (hits.length) {
  console.error(`check-copy: ${hits.length} problem(s) in the rendered copy`);
  for (const h of hits) console.error("  ✗ " + h);
  process.exit(1);
}
console.log(`check-copy: clean — ${texts.length} text blocks checked (page, metadata, OG image)`);

// Build-time evidence: reads the monorepo's dated eval records + fleet
// snapshot + the latest live run and writes src/data/evidence.json, which
// the site imports statically. No runtime backend calls — the page shows
// exactly what was on disk when this ran. Re-run before every rebuild:
//   node scripts/build-evidence.mjs
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.env.SHERRYOS_ROOT ?? "/home/sherry/sherryos";
const APPS = ["voice-receptionist", "restaurant-bot", "sales-os", "job-hunter"];
const SERVICE_STATUS = {
  "voice-receptionist": "live",
  "restaurant-bot": "offline",
  "sales-os": "pipeline (manual runs)",
};

const latest = (dir, filter) => {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(filter).sort();
  return files.length ? JSON.parse(readFileSync(join(dir, files.at(-1)), "utf8")) : null;
};

const evals = APPS.map((app) =>
  latest(join(ROOT, "apps", app, "docs", "evals"), (f) => f.endsWith("-eval.json"))
)
  .filter(Boolean)
  .map((e) => ({ ...e, status: SERVICE_STATUS[e.app] ?? "" }));

const fleet = latest(join(ROOT, "docs", "evals"), (f) => f.includes("fleet-stats"));
const liveRun = latest(join(ROOT, "apps", "sales-os", "docs", "evals"), (f) => f.endsWith("-phase1-live.json"));

const out = {
  generated: new Date().toISOString().slice(0, 10),
  evals,
  fleet,
  liveRun: liveRun && {
    date: liveRun.date, query: liveRun.query, product: liveRun.product,
    places: liveRun.places_returned, leads: liveRun.leads, prospects: liveRun.prospects,
    costUsd: liveRun.cost_estimate_usd, coldDrafts: liveRun.drafts?.real_leads_drafted ?? 0,
  },
};
writeFileSync("src/data/evidence.json", JSON.stringify(out, null, 2) + "\n");
console.log(`evidence.json: ${evals.length} evals, fleet=${fleet ? fleet.runs + " runs" : "none"}, liveRun=${liveRun ? liveRun.date : "none"}`);

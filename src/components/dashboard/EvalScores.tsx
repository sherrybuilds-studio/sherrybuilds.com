"use client";
import { motion } from "framer-motion";
import evidence from "@/data/evidence.json";

// Real, dated eval records (src/data/evidence.json, built from the monorepo's
// docs/evals/*.json). No hand-typed scores — see 03-System/Verified-Metrics.md.
const NAMES: Record<string, string> = {
  "voice-receptionist": "Voice Receptionist",
  "restaurant-bot": "Restaurant Bot",
  "sales-os": "Sales OS",
  "job-hunter": "Job Pipeline",
};
const GRADIENTS = [
  "from-cyan-500 to-blue-400",
  "from-green-500 to-emerald-400",
  "from-violet-500 to-blue-400",
  "from-amber-500 to-orange-400",
];

const evals = evidence.evals
  .filter((e) => e.passed !== null && e.total)
  .map((e, i) => ({
    name: NAMES[e.app] ?? e.app,
    score: Math.round((1000 * (e.passed as number)) / (e.total as number)) / 10,
    gradient: GRADIENTS[i % GRADIENTS.length],
    label: `${e.passed}/${e.total} · ${e.date}${e.status ? ` · ${e.status}` : ""}`,
  }));

export default function EvalScores() {
  const avg = evals.length ? evals.reduce((sum, e) => sum + e.score, 0) / evals.length : 0;

  return (
    <section className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Eval Scores</h2>
          <p className="text-[11px] text-white/30 mt-0.5">Latest dated run · offline gates</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono font-semibold text-white">{avg.toFixed(1)}%</p>
          <p className="text-[10px] text-white/30">avg</p>
        </div>
      </div>
      <div className="space-y-6">
        {evals.map((ev, i) => (
          <div key={ev.name}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-white/80">{ev.name}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{ev.label}</p>
              </div>
              <span className="text-base font-mono font-semibold text-white">{ev.score}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${ev.gradient}`}
                initial={{ width: "0%" }}
                animate={{ width: `${ev.score}%` }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.9, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
        {!evals.length && (
          <p className="text-xs text-white/40">No eval records yet — run the gates and rebuild evidence.json.</p>
        )}
      </div>
    </section>
  );
}

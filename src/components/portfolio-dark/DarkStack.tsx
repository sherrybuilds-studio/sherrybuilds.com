import Reveal from "@/components/portfolio/Reveal";

type Group = {
  label: string;
  tools: string[];
};

// Trimmed 2026-09-18 (Sherry's call): ~4–5 interview-defensible tools per
// category, each tool rendered exactly ONCE — the old marquee needed its
// content duplicated to loop seamlessly, which read as "Langfuse ×3" on a
// public page. Static rows now; dropped slowapi/Uvicorn/standalone
// Pydantic/GSAP/ClickHouse and the filler.
const GROUPS: Group[] = [
  {
    label: "AI & retrieval",
    tools: ["Claude", "ChromaDB", "hybrid search", "semantic caching", "eval gates"],
  },
  {
    label: "Backend & data",
    tools: ["Python", "FastAPI", "PostgreSQL", "Supabase", "Redis"],
  },
  {
    label: "Voice & messaging",
    tools: ["Vapi", "Deepgram", "ElevenLabs", "WhatsApp Cloud API", "Telegram"],
  },
  {
    label: "Infra & observability",
    tools: ["Docker", "PM2", "Cloudflare", "Langfuse"],
  },
  {
    label: "Frontend",
    tools: ["Next.js", "TypeScript", "Three.js", "Tailwind"],
  },
  {
    label: "Quality",
    tools: ["pytest", "ruff", "GitHub Actions", "gitleaks"],
  },
];

// cyan used sparingly — exactly two keystone tools across all rows
const ACCENT_TOOLS = new Set(["Claude", "Langfuse"]);

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

function Pill({ tool }: { tool: string }) {
  const accent = ACCENT_TOOLS.has(tool);
  return <span className={`pf-pill${accent ? " pf-pill--accent" : ""}`}>{tool}</span>;
}

function StackRow({ group }: { group: Group }) {
  return (
    <div className="flex flex-col gap-y-[var(--space-4)] py-[var(--space-6)] md:flex-row md:items-center md:py-[var(--space-6)]">
      <span className="flex-none uppercase md:w-[13rem]" style={mono}>
        {group.label}
      </span>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--space-3)]">
        {group.tools.map((t) => (
          <li key={t} className="list-none">
            <Pill tool={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DarkStack() {
  return (
    <section
      id="stack"
      aria-labelledby="stack-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(6rem, 14vh, 10rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        {/* Headline — centered, house scrim for crispness over the fluid */}
        <div className="relative mx-auto max-w-[56rem] text-center">
          <div
            aria-hidden="true"
            className="absolute -z-10"
            style={{
              inset: "-12% -25%",
              background:
                "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10, 14, 26, 0.85) 0%, rgba(10, 14, 26, 0.5) 50%, transparent 75%)",
            }}
          />
          <Reveal>
            <p className="uppercase" style={mono}>
              04 — Stack
            </p>
            <h2
              id="stack-heading"
              className="mx-auto mt-[var(--space-6)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--step-6)",
                fontWeight: 480,
                lineHeight: 1.08,
                letterSpacing: "-0.015em",
                color: "var(--text)",
              }}
            >
              The tools I reach for.
            </h2>
          </Reveal>
        </div>

        {/* Six static rows in one glass panel — every tool exactly once */}
        <div
          className="glass glass-glow mx-auto mt-[var(--space-16)] max-w-[72rem] rounded-3xl lg:mt-[var(--space-24)]"
          style={{ padding: "clamp(1.5rem, 4vw, 2.75rem)" }}
        >
          {GROUPS.map((g, i) => (
            <Reveal key={g.label} delay={i * 0.06} className={i > 0 ? "border-t" : ""}>
              <StackRow group={g} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

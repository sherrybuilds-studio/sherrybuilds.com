import Reveal from "@/components/portfolio/Reveal";

type Group = {
  label: string;
  tools: string[];
  /** seconds per loop — slow reads premium */
  duration: number;
  reverse?: boolean;
};

const GROUPS: Group[] = [
  {
    label: "Languages",
    tools: ["Python", "TypeScript", "SQL", "Bash"],
    duration: 38,
  },
  {
    label: "AI & retrieval",
    tools: [
      "Claude",
      "OpenRouter",
      "ChromaDB",
      "MiniLM embeddings",
      "hybrid search",
      "semantic caching",
      "eval gates",
    ],
    duration: 50,
    reverse: true,
  },
  {
    label: "Backend",
    tools: ["FastAPI", "Pydantic", "Uvicorn", "slowapi"],
    duration: 40,
  },
  {
    label: "Data & infra",
    tools: [
      "PostgreSQL",
      "Supabase",
      "Redis",
      "ClickHouse",
      "Docker",
      "Caddy",
      "Cloudflare",
      "PM2",
    ],
    duration: 52,
    reverse: true,
  },
  {
    label: "Observability",
    tools: ["Langfuse", "structured logging"],
    duration: 34,
  },
  {
    label: "Voice & messaging",
    tools: ["Vapi", "Deepgram", "ElevenLabs", "WhatsApp Cloud API", "Telegram Bot API"],
    duration: 46,
    reverse: true,
  },
  {
    label: "Automation",
    tools: ["n8n", "Playwright", "Firecrawl"],
    duration: 38,
  },
  {
    label: "Frontend",
    tools: ["Next.js", "React", "GSAP", "Three.js"],
    duration: 44,
  },
  {
    label: "Quality",
    tools: ["GitHub Actions", "pytest", "ruff", "gitleaks"],
    duration: 42,
    reverse: true,
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

function MarqueeRow({ group }: { group: Group }) {
  // enough pills per group to always exceed the viewport width
  const repeats = Math.ceil(10 / group.tools.length);
  const pills = Array.from({ length: repeats }, () => group.tools).flat();

  return (
    <div className="flex flex-col gap-y-[var(--space-4)] py-[var(--space-8)] md:flex-row md:items-center md:py-[var(--space-8)]">
      <span className="flex-none uppercase md:w-[13rem]" style={mono}>
        {group.label}
        {/* static list for screen readers — the marquee is decorative motion */}
        <span className="sr-only">: {group.tools.join(", ")}</span>
      </span>
      <div
        className="pf-marquee min-w-0 flex-1"
        data-dir={group.reverse ? "reverse" : "forward"}
        aria-hidden="true"
        style={{ "--marquee-dur": `${group.duration}s` } as React.CSSProperties}
      >
        <div className="pf-marquee-track">
          {[0, 1].map((copy) => (
            <div className="pf-marquee-group" key={copy}>
              {pills.map((t, i) => (
                <Pill key={`${copy}-${i}`} tool={t} />
              ))}
            </div>
          ))}
        </div>
      </div>
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

        {/* Five continuous marquees, alternating direction, in one panel */}
        <div
          className="glass glass-glow mx-auto mt-[var(--space-16)] max-w-[72rem] rounded-3xl lg:mt-[var(--space-24)]"
          style={{ padding: "clamp(1.5rem, 4vw, 2.75rem)" }}
        >
          {GROUPS.map((g, i) => (
            <Reveal key={g.label} delay={i * 0.06} className={i > 0 ? "border-t" : ""}>
              <MarqueeRow group={g} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

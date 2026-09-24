import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The share card LinkedIn/WhatsApp/Slack render for sherrybuilds.com.
// Generated at build time (the root page is static), so the vendored TTFs
// in src/app/og/ resolve against the repo — no runtime fetch, no network.
// Design = the dark portfolio's own tokens (globals.css .portfolio-dark)
// and its signature statement, not a screenshot.

export const alt =
  "Shehryar Irfan — AI Engineer, Berlin. The difference between a demo and a system is measurability.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Ferrofluid BASE_BACKGROUND, frozen (Satori supports these gradients).
const BG = [
  "radial-gradient(circle at 28% 18%, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0) 55%)",
  "radial-gradient(circle at 82% 60%, rgba(34, 211, 238, 0.14) 0%, rgba(34, 211, 238, 0) 50%)",
  "radial-gradient(circle at 55% 105%, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 55%)",
  "linear-gradient(180deg, #0a0e1a 0%, #0c1222 55%, #0a0e1a 100%)",
].join(", ");

export default async function OgImage() {
  const dir = join(process.cwd(), "src/app/og");
  const [fraunces, frauncesItalic, jetbrains] = await Promise.all([
    readFile(join(dir, "fraunces-560.ttf")),
    readFile(join(dir, "fraunces-italic-480.ttf")),
    readFile(join(dir, "jetbrains-500.ttf")),
  ]);

  const mono: React.CSSProperties = {
    fontFamily: "JetBrains Mono",
    fontSize: 22,
    letterSpacing: "0.14em",
    color: "#97a3c1",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundImage: BG,
        }}
      >
        {/* kicker */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, backgroundColor: "#22d3ee" }} />
          <div style={{ ...mono, color: "#67e2f5" }}>SHERRYBUILDS.COM</div>
        </div>

        {/* name + statement */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: 86,
              fontWeight: 600,
              color: "#eaf0ff",
              letterSpacing: "-0.015em",
            }}
          >
            <span>Shehryar Irfan</span>
            <span style={{ color: "#22d3ee" }}>.</span>
          </div>
          <div style={{ ...mono, display: "flex", marginTop: 14 }}>
            AI ENGINEER — BERLIN
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: 44,
              maxWidth: 900,
              fontFamily: "Fraunces",
              fontSize: 44,
              fontWeight: 600,
              color: "#eaf0ff",
              lineHeight: 1.25,
            }}
          >
            <span>The difference between a demo and a system is&nbsp;</span>
            <span style={{ fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 500, color: "#22d3ee" }}>
              measurability.
            </span>
          </div>
        </div>

        {/* footer — the three systems, mono like the site's captions */}
        <div style={{ ...mono, display: "flex", fontSize: 20 }}>
          VOICE RECEPTIONIST · SELF-HEALING AGENT FLEET · RAG PIPELINES
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600 as const, style: "normal" as const },
        { name: "Fraunces", data: frauncesItalic, weight: 500 as const, style: "italic" as const },
        { name: "JetBrains Mono", data: jetbrains, weight: 500 as const, style: "normal" as const },
      ],
    }
  );
}

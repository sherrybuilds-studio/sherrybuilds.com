"use client";

import { useEffect, useRef, useState } from "react";

// Floating "ask about my work" widget. Talks only to the same-origin
// /api/chat proxy; answers cite the public showcase. States follow the
// ux-writing rules: named loading, human errors, no blank panels.

type Citation = { n: number; file: string; heading: string };
type Msg = { role: "you" | "bot"; text: string; citations?: Citation[]; refused?: boolean };

const SUGGESTIONS = [
  "What does the voice receptionist do?",
  "How does the agent fleet heal itself?",
  "Which eval gates exist?",
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "0.7rem",
  letterSpacing: "0.06em",
  color: "var(--muted)",
};

export default function DarkChat() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setQ("");
    setMsgs((m) => [...m, { role: "you", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setMsgs((m) => [...m, { role: "bot", text: body.error ?? "Couldn't reach the assistant — try again in a minute.", refused: true }]);
      } else {
        setMsgs((m) => [...m, { role: "bot", text: body.answer, citations: body.citations, refused: body.refused }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Couldn't reach the assistant — check your connection and try again.", refused: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="chat-panel"
        className="glass pf-btn fixed bottom-5 right-5 z-[55] inline-flex items-center gap-2 rounded-full px-5 font-medium"
        style={{
          height: "2.75rem",
          fontSize: "0.9rem",
          color: "var(--text)",
          background: "linear-gradient(180deg, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0.10))",
          borderColor: "rgba(34, 211, 238, 0.40)",
        }}
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 8px rgba(34, 211, 238, 0.8)" }}
        />
        {open ? "Close" : "Ask about my work"}
      </button>

      {open && (
        <section
          id="chat-panel"
          aria-label="Ask about Shehryar's work"
          className="glass fixed bottom-[4.75rem] right-5 z-[55] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl"
          style={{ maxHeight: "min(32rem, 70vh)", background: "rgba(10, 14, 26, 0.92)" }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--glass-border)" }}>
            <p className="uppercase" style={mono}>
              Grounded in the published showcase · cites its sources · it&apos;s an AI
            </p>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" style={{ minHeight: "9rem" }}>
            {msgs.length === 0 && (
              <div>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.55 }}>
                  Ask anything about the projects on this page. Answers come only from the
                  public showcase and name their source.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="glass rounded-full px-3 py-1.5"
                      style={{ fontSize: "0.75rem", color: "var(--text)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "you" ? "text-right" : ""}>
                <p
                  className="inline-block rounded-xl px-3 py-2 text-left"
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                    color: "var(--text)",
                    background: m.role === "you" ? "rgba(34, 211, 238, 0.14)" : "rgba(255,255,255,0.05)",
                    opacity: m.refused ? 0.85 : 1,
                    maxWidth: "92%",
                  }}
                >
                  {m.text}
                </p>
                {m.citations && m.citations.length > 0 && (
                  <p className="mt-1" style={{ ...mono, lineHeight: 1.6 }}>
                    {m.citations.map((c) => `[${c.n}] ${c.file} › ${c.heading}`).join("  ·  ")}
                  </p>
                )}
              </div>
            ))}
            {busy && (
              <p style={{ ...mono, color: "var(--accent)" }} aria-live="polite">
                Reading the showcase… (about 10 seconds)
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="flex gap-2 border-t p-3"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={500}
              placeholder="e.g. how are calls kept compliant?"
              aria-label="Your question"
              className="glass min-w-0 flex-1 rounded-full px-4"
              style={{ height: "2.5rem", fontSize: "0.9rem", color: "var(--text)", background: "transparent" }}
            />
            <button
              type="submit"
              disabled={busy || !q.trim()}
              className="glass pf-btn rounded-full px-4 font-medium disabled:opacity-50"
              style={{ height: "2.5rem", fontSize: "0.85rem", color: "var(--text)" }}
            >
              Ask
            </button>
          </form>
        </section>
      )}
    </>
  );
}

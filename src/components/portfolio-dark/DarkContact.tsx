"use client";

import { useState } from "react";
import { z } from "zod";
import Reveal from "@/components/portfolio/Reveal";

// VERIFY: fill in the real values (email is from the account, the other
// two are placeholders) — also update the footer automatically below.
const LINKS = [
  { label: "Email", href: "mailto:codewithsherry1@gmail.com", text: "codewithsherry1@gmail.com" }, // VERIFY
  { label: "GitHub", href: "https://github.com/sherrybuilds-studio", text: "github.com/sherrybuilds-studio" }, // VERIFY
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shehryar-irfan-bb5469349", text: "linkedin.com/in/shehryar-irfan" },
];

const schema = z.object({
  name: z.string().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email."),
  message: z.string().min(10, "A couple of sentences helps."),
});

type Errors = Partial<Record<"name" | "email" | "message", string>>;
type Status = "idle" | "sending" | "success" | "error";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "2.75rem",
  padding: "0.7rem 1rem",
  borderRadius: "0.75rem",
  border: "1px solid var(--glass-border)",
  background: "rgba(255, 255, 255, 0.04)",
  color: "var(--text)",
  fontSize: "0.95rem",
  lineHeight: 1.5,
  outline: "none",
  transition: "border-color var(--dur-ui) var(--ease)",
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-[var(--space-2)] block uppercase" style={mono}>
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-[var(--space-1)]" style={{ fontSize: "0.8rem", color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function DarkContact() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const values = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
      company: String(fd.get("company") ?? ""), // honeypot
    };

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setStatus("success");
      } else {
        setServerError(body.error ?? "Couldn't send right now — try email instead.");
        setStatus("error");
      }
    } catch {
      setServerError("Couldn't send right now — try email instead.");
      setStatus("error");
    }
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(6rem, 14vh, 10rem) 0" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        {/* Headline */}
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
              06 — Contact
            </p>
            <h2
              id="contact-heading"
              className="mx-auto mt-[var(--space-6)] max-w-[18ch]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--step-6)",
                fontWeight: 480,
                lineHeight: 1.08,
                letterSpacing: "-0.015em",
                color: "var(--text)",
                textWrap: "balance",
              }}
            >
              Let&apos;s build something that{" "}
              <em style={{ color: "var(--accent)", fontWeight: 440 }}>works</em>.
            </h2>
            <p
              className="mx-auto mt-[var(--space-6)] max-w-[44ch]"
              style={{ fontSize: "var(--step-1)", lineHeight: 1.55, color: "var(--muted)" }}
            >
              Open to Werkstudent roles in Berlin — or just say hello.
            </p>
          </Reveal>
        </div>

        {/* Card: form left, direct links right */}
        <Reveal className="glass glass-glow mx-auto mt-[var(--space-16)] max-w-[64rem] rounded-3xl lg:mt-[var(--space-24)]">
          <div
            className="grid grid-cols-1 gap-[var(--space-12)] lg:grid-cols-12"
            style={{ padding: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            <div className="lg:col-span-7">
              {status === "success" ? (
                <div aria-live="polite" className="flex h-full flex-col justify-center">
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--step-3)",
                      color: "var(--text)",
                      fontWeight: 480,
                    }}
                  >
                    Message sent<span style={{ color: "var(--accent)" }}>.</span>
                  </p>
                  <p
                    className="mt-[var(--space-3)]"
                    style={{ color: "var(--muted)", fontSize: "var(--step-0)", lineHeight: 1.65 }}
                  >
                    Thanks for reaching out — I read everything and I&apos;ll
                    reply within a day.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[var(--space-6)]">
                  {/* honeypot */}
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                  />
                  <div className="grid grid-cols-1 gap-[var(--space-6)] sm:grid-cols-2">
                    <Field id="c-name" label="Name" error={errors.name}>
                      <input id="c-name" name="name" type="text" autoComplete="name" style={inputStyle} />
                    </Field>
                    <Field id="c-email" label="Email" error={errors.email}>
                      <input id="c-email" name="email" type="email" autoComplete="email" style={inputStyle} />
                    </Field>
                  </div>
                  <Field id="c-message" label="Message" error={errors.message}>
                    <textarea id="c-message" name="message" rows={5} style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>

                  {status === "error" && (
                    <p aria-live="assertive" style={{ fontSize: "0.85rem", color: "#f87171" }}>
                      {serverError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="glass pf-btn inline-flex w-fit items-center rounded-full px-8 font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0.10))",
                      borderColor: "rgba(34, 211, 238, 0.40)",
                      color: "var(--text)",
                      height: "3rem",
                      fontSize: "0.95rem",
                    }}
                  >
                    {status === "sending" ? "Sending…" : "Send message"}
                  </button>
                </form>
              )}
            </div>

            {/* direct links */}
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="uppercase" style={mono}>
                Or directly
              </p>
              <ul className="mt-[var(--space-4)]">
                {LINKS.map((l, i) => (
                  <li key={l.label} className={`py-[var(--space-4)] ${i > 0 ? "border-t" : ""}`}>
                    <span className="block uppercase" style={{ ...mono, fontSize: "0.7rem" }}>
                      {l.label}
                    </span>
                    <a
                      href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : undefined}
                      rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="pf-underline mt-[var(--space-1)] inline-block"
                      style={{
                        fontFamily: "var(--font-label)",
                        fontSize: "0.85rem",
                        color: "var(--accent-ink)",
                        letterSpacing: "0.02em",
                        wordBreak: "break-all",
                      }}
                    >
                      {l.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* Footer */}
        <footer
          className="mt-[var(--space-24)] border-t"
          style={{ paddingBlock: "var(--space-8)" }}
        >
          <div className="flex flex-col items-center justify-between gap-[var(--space-4)] text-center md:flex-row md:text-left">
            <p style={mono}>
              Shehryar Irfan · Berlin · {new Date().getFullYear()}
            </p>
            <ul className="flex items-center gap-[var(--space-6)]">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="pf-underline"
                    style={{ ...mono, color: "var(--muted)" }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
}

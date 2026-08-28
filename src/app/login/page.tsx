"use client"

import { useState, useTransition, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Zap, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { safeReturnPath } from "@/lib/safe-path"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // The gate sets ?from=<path>; never follow it off-site.
  const from = safeReturnPath(searchParams.get("from"))

  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError("Incorrect password.")
        setPassword("")
      }
    })
  }

  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SherryBuilds OS</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Mission Control · Berlin</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Access Required
            </span>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground"
              >
                Dashboard password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-input/30 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                >
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-[oklch(0.65_0.22_25)] mt-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Unlock Dashboard"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          Set via <code className="font-mono">DASHBOARD_PASSWORD</code> in .env.local
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

// GET /up — deployment health gate.
//
// Deliberately dependency-free: it must NOT touch the chat backend, Resend,
// or anything over the network. A health endpoint that checks downstream
// services turns a downstream blip into a rolled-back deploy of a perfectly
// good image. This answers exactly one question: "is this server process up
// and able to serve a request?"
//
// Used by: the Dockerfile HEALTHCHECK, and deploy/vps-pull-release.sh, which
// refuses to route traffic to a new container until this returns 200.
//
// IMAGE_REVISION is the git SHA the image was built from (passed in by the
// deploy script from the image's org.opencontainers.image.revision label), so
// "which commit is live?" has a one-line answer: curl -s /up.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET() {
  return Response.json(
    { ok: true, revision: process.env.IMAGE_REVISION ?? null },
    { headers: { 'cache-control': 'no-store' } },
  )
}

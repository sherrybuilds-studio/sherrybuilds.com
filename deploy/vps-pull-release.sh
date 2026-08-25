#!/usr/bin/env bash
# vps-pull-release.sh — the VPS half of the portfolio's CD.
#
# GitHub Actions builds ghcr.io/sherrybuilds-studio/sherrybuilds-portfolio:<sha>
# and, after human approval on the `production` environment, moves the
# floating `release` tag to it. This script runs from cron every 2 minutes,
# pulls `release`, and if the image changed, promotes it with a health gate
# and a retained rollback target. Nothing on GitHub can reach this box; the
# box pulls. That keeps the VPS outbound-only, like the cloudflared tunnel.
#
# Promotion sequence (the site keeps serving at every step):
#   1. docker pull :release — a no-op if unchanged; exit quietly.
#   2. Refuse if free disk is below the floor.
#   3. STAGE: run the new image on 127.0.0.1:3100 and poll /up for 200.
#      A broken image never gets past here; the live container is untouched.
#   4. SWAP: stop the live container (kept as <name>-prev), start the new
#      one on 127.0.0.1:3000, poll /up again.
#   5. If the swap fails, restart -prev on :3000 and exit non-zero.
#   6. Prune images of this service beyond the newest 3.
#
# Secrets: runtime env is carried from the previous container plus
# .env.local via --env-file into a 0600 temp file that is shredded on exit.
# No value is ever echoed. This script never reads .env.local's contents
# into its own output.
#
# Cron line (sherry's crontab):
#   */2 * * * * flock -n /tmp/portfolio-release.lock \
#     /home/sherry/frontend/sherrybuilds-os/deploy/vps-pull-release.sh \
#     >> /home/sherry/personal/sherry-os/logs/portfolio-release.log 2>&1
#
# Usage:
#   vps-pull-release.sh              normal cron invocation
#   vps-pull-release.sh --stage-only pull + stage + health-check, then tear
#                                    the stage down without touching live
#                                    (first-run dry test)
#   vps-pull-release.sh --force      promote even if the image ID matches
#                                    (re-create the container, e.g. after an
#                                    .env.local change)

set -euo pipefail

IMAGE="ghcr.io/sherrybuilds-studio/sherrybuilds-portfolio"
# RELEASE_TAG lets an operator dry-run a specific SHA before it is approved:
#   RELEASE_TAG=<sha> ./vps-pull-release.sh --stage-only
TAG="${RELEASE_TAG:-release}"
NAME="sherrybuilds-portfolio"
SERVICE_LABEL="service=sherrybuilds-portfolio"
APP_DIR="/home/sherry/frontend/sherrybuilds-os"
ENV_LOCAL="$APP_DIR/.env.local"
LIVE_PORT=3000
STAGE_PORT=3100
# The chat proxy route falls back to this when unset; make it explicit so a
# future network change cannot silently break /api/chat. 172.17.0.1 is the
# docker0 gateway and ufw allows 7040 on that interface specifically.
CHAT_BACKEND_URL="http://172.17.0.1:7040"
DISK_FLOOR_KB=$((5 * 1024 * 1024)) # 5 GiB
STAGE_TIMEOUT=90
SWAP_TIMEOUT=45
KEEP_IMAGES=3

STAGE_ONLY=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --stage-only) STAGE_ONLY=1 ;;
    --force) FORCE=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

ENV_TMP=""
cleanup() {
  if [ -n "$ENV_TMP" ] && [ -f "$ENV_TMP" ]; then
    shred -u "$ENV_TMP" 2>/dev/null || rm -f "$ENV_TMP"
  fi
}
trap cleanup EXIT

# ── 1. pull ────────────────────────────────────────────────────────────────
# Pull failure (registry down, package private, network) is NOT an error for
# the site: the live container keeps serving. Log and leave.
if ! pull_out=$(docker pull -q "$IMAGE:$TAG" 2>&1); then
  # "not found" is the normal state before the first approval moves the
  # release tag — stay silent so the log only ever contains events. Any
  # OTHER failure (auth, network, registry) is worth a line.
  case "$pull_out" in *"not found"*) exit 0 ;; esac
  log "pull failed — leaving live container alone: ${pull_out##*$'\n'}"
  exit 0
fi

NEW_ID=$(docker image inspect "$IMAGE:$TAG" --format '{{.Id}}')
CUR_ID=$(docker inspect "$NAME" --format '{{.Image}}' 2>/dev/null || echo "none")
NEW_REV=$(docker image inspect "$IMAGE:$TAG" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || echo "")

if [ "$NEW_ID" = "$CUR_ID" ] && [ "$FORCE" = 0 ] && [ "$STAGE_ONLY" = 0 ]; then
  exit 0 # nothing to do; stay silent so the cron log only shows events
fi

log "new release: image=${NEW_ID:7:12} revision=${NEW_REV:0:12} (live=${CUR_ID:7:12})"

# ── 2. disk floor ──────────────────────────────────────────────────────────
avail_kb=$(df --output=avail -k / | tail -1 | tr -d ' ')
if [ "$avail_kb" -lt "$DISK_FLOOR_KB" ]; then
  log "REFUSED: free disk ${avail_kb}KB below floor ${DISK_FLOOR_KB}KB"
  exit 1
fi

# ── runtime env: carry forward, never retype, never print ─────────────────
ENV_TMP=$(mktemp /tmp/portfolio-env.XXXXXX)
chmod 600 "$ENV_TMP"
if [ "$CUR_ID" != "none" ]; then
  docker inspect "$NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -vE '^(PATH|NODE_VERSION|YARN_VERSION|HOSTNAME|HOME|NODE_ENV|NEXT_TELEMETRY_DISABLED|IMAGE_REVISION|CHAT_BACKEND_URL)=' \
    > "$ENV_TMP" || true
fi
env_args=(--env-file "$ENV_TMP")
# .env.local is the on-disk source of truth and wins over carried values.
[ -f "$ENV_LOCAL" ] && env_args+=(--env-file "$ENV_LOCAL")
env_args+=(-e NODE_ENV=production -e "CHAT_BACKEND_URL=$CHAT_BACKEND_URL")
[ -n "$NEW_REV" ] && env_args+=(-e "IMAGE_REVISION=$NEW_REV")

wait_healthy() { # url timeout_s
  local url=$1 timeout=$2 i code
  for ((i = 0; i < timeout; i++)); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$url" || true)
    [ "$code" = "200" ] && return 0
    sleep 1
  done
  return 1
}

# ── 3. stage ───────────────────────────────────────────────────────────────
docker rm -f "$NAME-stage" >/dev/null 2>&1 || true
docker run -d --name "$NAME-stage" \
  -p "127.0.0.1:$STAGE_PORT:3000" \
  "${env_args[@]}" \
  "$IMAGE:$TAG" >/dev/null

if ! wait_healthy "http://127.0.0.1:$STAGE_PORT/up" "$STAGE_TIMEOUT"; then
  log "STAGE FAILED: /up never returned 200 on :$STAGE_PORT within ${STAGE_TIMEOUT}s — live untouched"
  docker logs --tail 40 "$NAME-stage" 2>&1 | sed 's/^/    stage| /'
  docker rm -f "$NAME-stage" >/dev/null 2>&1 || true
  exit 1
fi
log "stage healthy on :$STAGE_PORT"
docker rm -f "$NAME-stage" >/dev/null 2>&1 || true

if [ "$STAGE_ONLY" = 1 ]; then
  log "--stage-only: stage verified, live untouched"
  exit 0
fi

# ── 4. swap ────────────────────────────────────────────────────────────────
docker rm -f "$NAME-prev" >/dev/null 2>&1 || true
if [ "$CUR_ID" != "none" ]; then
  docker stop -t 5 "$NAME" >/dev/null
  docker rename "$NAME" "$NAME-prev"
fi

docker run -d --name "$NAME" --restart always \
  -p "127.0.0.1:$LIVE_PORT:3000" \
  --label "$SERVICE_LABEL" \
  "${env_args[@]}" \
  "$IMAGE:$TAG" >/dev/null

if wait_healthy "http://127.0.0.1:$LIVE_PORT/up" "$SWAP_TIMEOUT"; then
  log "LIVE: revision=${NEW_REV:0:12} on :$LIVE_PORT (previous kept as $NAME-prev)"
else
  # ── 5. rollback ────────────────────────────────────────────────────────
  log "SWAP FAILED on :$LIVE_PORT — rolling back"
  docker logs --tail 40 "$NAME" 2>&1 | sed 's/^/    new| /'
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  if [ "$CUR_ID" != "none" ]; then
    docker rename "$NAME-prev" "$NAME"
    docker start "$NAME" >/dev/null
    # The previous image may predate /up; `/` is the shared health path.
    if wait_healthy "http://127.0.0.1:$LIVE_PORT/" "$SWAP_TIMEOUT"; then
      log "ROLLBACK OK: previous container serving again"
    else
      log "ROLLBACK FAILED: previous container did not come back — MANUAL ACTION NEEDED"
    fi
  fi
  exit 1
fi

# ── 6. prune: keep the newest N images of this service ────────────────────
docker images "$IMAGE" --format '{{.ID}} {{.CreatedAt}}' \
  | sort -k2 -r | awk -v keep="$KEEP_IMAGES" 'NR > keep {print $1}' \
  | while read -r id; do
      docker rmi "$id" >/dev/null 2>&1 && log "pruned image ${id:0:12}" || true
    done

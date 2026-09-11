-- 002 — lossless-pipeline additions (2026-09-11). Run in the root project's
-- SQL editor after 001 (or in the same paste). Every statement is idempotent.

-- Set by the site right after the Telegram alert went out; the daily
-- outside-in probe reads it to prove the Telegram hop end to end.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS notified_at timestamptz;
-- The daily watchdog submits through the public form; its rows are flagged
-- so lead views and the 09:00 brief's counts exclude them.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS synthetic boolean NOT NULL DEFAULT false;
-- Original length when an oversized message was capped (kept, not dropped).
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS truncated_from integer;

-- Real leads only. security_invoker keeps the base table's RLS in force for
-- whoever queries the view (nobody but the secret key, as intended).
CREATE OR REPLACE VIEW contact_leads WITH (security_invoker = true) AS
  SELECT id, created_at, name, email, message, ip, user_agent, source, notified_at, truncated_from
  FROM contact_messages
  WHERE NOT synthetic;

CREATE INDEX IF NOT EXISTS contact_messages_synthetic_idx ON contact_messages (synthetic) WHERE synthetic;

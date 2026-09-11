-- contact_messages — every /api/contact submission from sherrybuilds.com.
-- Root Supabase project (the one in ~/sherryos/.env). Run once in the
-- Supabase SQL editor; the site writes with the project's secret key, which
-- bypasses RLS. RLS is enabled with NO policies on purpose: the anon and
-- authenticated roles can neither read nor write this table.

CREATE TABLE IF NOT EXISTS contact_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  message     text        NOT NULL,
  ip          text,                    -- Cloudflare's cf-connecting-ip, abuse triage only
  user_agent  text,
  source      text        NOT NULL DEFAULT 'sherrybuilds.com'
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON contact_messages (email);

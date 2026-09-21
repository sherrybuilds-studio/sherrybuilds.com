-- 003 — page_visits: first-party visitor analytics for sherrybuilds.com.
-- One row per page view, no cookies, no cross-day tracking. Root Supabase
-- project; paste into the SQL editor after 001/002. Idempotent.
-- RLS enabled with NO policies on purpose: only the secret key writes/reads.

CREATE TABLE IF NOT EXISTS page_visits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  path        text        NOT NULL,
  referrer    text,                  -- where they came from (empty for direct)
  country     text,                  -- Cloudflare cf-ipcountry (DE, US, …)
  user_agent  text,
  -- sha256(ip + UTC day): groups one visitor's views within a day, but is
  -- untraceable across days and never stores the raw IP (GDPR-lean).
  visitor     text,
  is_bot      boolean     NOT NULL DEFAULT false,
  source      text        NOT NULL DEFAULT 'sherrybuilds.com'
);

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS page_visits_created_at_idx ON page_visits (created_at DESC);

-- "Who visits?" in one query: daily human views/visitors/countries/referrers.
CREATE OR REPLACE VIEW visit_summary WITH (security_invoker = true) AS
  SELECT date_trunc('day', created_at)::date AS day,
         count(*)                            AS views,
         count(DISTINCT visitor)             AS visitors,
         array_agg(DISTINCT country)  FILTER (WHERE country  IS NOT NULL) AS countries,
         array_agg(DISTINCT referrer) FILTER (WHERE referrer IS NOT NULL AND referrer <> '') AS referrers
  FROM page_visits
  WHERE NOT is_bot
  GROUP BY 1
  ORDER BY 1 DESC;

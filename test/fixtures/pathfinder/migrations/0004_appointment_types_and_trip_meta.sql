-- =============================================================================
-- Migration 0004 — add updating_sales_aids appointment type + adjust trip default
-- =============================================================================

-- Add the fifth appointment type used in field visits.
ALTER TABLE appointments DROP CONSTRAINT appointments_type_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_type_check
  CHECK (type IN (
    'prospecting',
    'presentation',
    'checkin',
    'training',
    'updating_sales_aids'
  ));

-- Lower default stop duration from 45 → 30 min to match the per-type constants
-- defined in packages/shared (prospecting=30, checkin=20, etc.).
-- 30 is the correct "unknown type" fallback for trip stops that have no appointment type.
ALTER TABLE trips ALTER COLUMN default_stop_minutes SET DEFAULT 30;

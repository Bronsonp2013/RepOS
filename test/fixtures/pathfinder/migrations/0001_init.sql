-- =============================================================================
-- Migration 0001 — initial schema
-- =============================================================================
-- Source: schema.sql (canonical documentation, repo root)
-- Applied by: scripts/db-migrate.ts
-- Notes:
--   - external_id column added to accounts for idempotent CSV upserts.
--     Maps to CUSTOMER_NUMBER1 in the Lexington seed CSV (see SEED_DATA_REPORT.md).
--   - All other content is verbatim from schema.sql.
-- =============================================================================

-- =============================================================================
-- Pathfinder — V1 Database Schema
-- =============================================================================
-- PostgreSQL 15+ with PostGIS extension
-- Target: V1 Solo Rep (Bronson only)
-- Conventions:
--   - Primary keys: BIGSERIAL (auto-increment bigint)
--   - Timestamps: TIMESTAMPTZ, always stored in UTC
--   - Soft delete: every business table has deleted_at TIMESTAMPTZ (NULL = live)
--   - Multi-tenancy stub: user_id BIGINT on every business table, nullable,
--     no FK in V1. V2 will add users table + FK + NOT NULL via migration.
--   - Naming: snake_case, plural table names
--   - Enums: implemented as CHECK constraints (easier to migrate than PG enums)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;  -- case-insensitive text (emails)

-- -----------------------------------------------------------------------------
-- Reusable trigger: auto-update updated_at on row UPDATE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CORE ENTITIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- accounts
--   The central entity. Retailers, designers, decorators, design-build firms.
--   114 Lexington accounts will seed this table from the uploaded CSV.
-- -----------------------------------------------------------------------------
CREATE TABLE accounts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                  -- V2 stub: owning rep
    name            TEXT NOT NULL,

    -- Opaque identifier from the source system used for idempotent upserts.
    -- Maps to CUSTOMER_NUMBER1 in the Lexington CSV. Other manufacturers will
    -- use their own identifiers. NULL for accounts created manually in the app.
    external_id     TEXT,

    account_type    TEXT NOT NULL CHECK (account_type IN (
                        'retail', 'designer', 'decorator', 'design_build', 'other'
                    )),

    -- Address
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,                    -- 2-letter state code
    zip             TEXT,
    country         TEXT NOT NULL DEFAULT 'US',

    -- Geo (PostGIS point, SRID 4326 = WGS84 lat/lng)
    -- Populated at import via geocoding; nullable for accounts without address
    location        GEOGRAPHY(POINT, 4326),

    -- Pipeline
    pipeline_stage  TEXT NOT NULL DEFAULT 'prospect' CHECK (pipeline_stage IN (
                        'prospect',
                        'outreach_sent',
                        'engaged',
                        'appointment_set',
                        'presentation_done',
                        'active_account',
                        'needs_followup',
                        'not_interested'
                    )),

    -- Cadence (A=30d, B=60d, C=90d — intervals live in app config, not DB)
    cadence_tier    CHAR(1) NOT NULL DEFAULT 'B' CHECK (cadence_tier IN ('A','B','C')),

    -- Denormalized for fast dashboard/map queries; updated by triggers or jobs
    last_visit_at       TIMESTAMPTZ,
    next_scheduled_at   TIMESTAMPTZ,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Free-form notes (long-form context, not a log — use interactions for log)
    notes           TEXT,

    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_accounts_user          ON accounts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_stage         ON accounts(pipeline_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_last_visit    ON accounts(last_visit_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_location      ON accounts USING GIST(location) WHERE deleted_at IS NULL;

-- Enable trigram search (needed for idx_accounts_name_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_accounts_name_trgm     ON accounts USING GIN(name gin_trgm_ops);  -- typo-tolerant search

-- Scoped per-user so two reps can import from the same source system without collision.
-- Partial index excludes NULLs (manually-created accounts have no external_id).
CREATE UNIQUE INDEX idx_accounts_external_id
    ON accounts(user_id, external_id)
    WHERE external_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- contacts
--   People at accounts. One account can have many contacts.
-- -----------------------------------------------------------------------------
CREATE TABLE contacts (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT,              -- V2 stub
    account_id          BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    first_name          TEXT,
    last_name           TEXT,
    title               TEXT,                -- "Owner", "Lead Designer", etc.

    email               CITEXT,              -- case-insensitive
    phone               TEXT,                -- stored as entered; format in app layer

    -- V1 is email-only but field is present for future SMS support
    preferred_channel   TEXT NOT NULL DEFAULT 'email'
                        CHECK (preferred_channel IN ('email', 'phone', 'none')),

    -- Contact-level opt-out. Different from account-level. Honors GDPR/CAN-SPAM.
    do_not_contact      BOOLEAN NOT NULL DEFAULT FALSE,
    do_not_contact_reason TEXT,              -- free text for audit

    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,  -- primary contact for account

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_contacts_account       ON contacts(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email         ON contacts(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE UNIQUE INDEX idx_contacts_one_primary_per_account
    ON contacts(account_id) WHERE is_primary = TRUE AND deleted_at IS NULL;

CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- INTERACTION LOG
-- =============================================================================

-- -----------------------------------------------------------------------------
-- interactions
--   Unified log of everything that happens with an account: emails in/out,
--   visits, calls, manual notes. One row per event. This is the timeline.
-- -----------------------------------------------------------------------------
CREATE TABLE interactions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                  -- V2 stub
    account_id      BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    contact_id      BIGINT REFERENCES contacts(id) ON DELETE SET NULL,  -- nullable for visits

    type            TEXT NOT NULL CHECK (type IN (
                        'email_sent',
                        'email_received',
                        'visit',
                        'call',
                        'note'
                    )),

    direction       TEXT CHECK (direction IN ('inbound', 'outbound', NULL)),

    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- For emails: subject line; for visits: short summary; for notes: headline
    subject         TEXT,
    body            TEXT,

    -- Structured payload for type-specific data (flexible, avoids schema sprawl)
    -- email_sent: { gmail_message_id, gmail_thread_id, outreach_draft_id }
    -- email_received: { gmail_message_id, gmail_thread_id, reply_intent }
    -- visit: { outcome, tags, trip_stop_id, photo_urls, location }
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_interactions_account   ON interactions(account_id, occurred_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_interactions_type      ON interactions(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_interactions_occurred  ON interactions(occurred_at DESC) WHERE deleted_at IS NULL;

-- Fast lookup by Gmail thread ID for reply parsing
CREATE INDEX idx_interactions_gmail_thread
    ON interactions((metadata->>'gmail_thread_id'))
    WHERE deleted_at IS NULL AND metadata ? 'gmail_thread_id';

CREATE TRIGGER trg_interactions_updated_at
    BEFORE UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- APPOINTMENTS & CALENDAR
-- =============================================================================

-- -----------------------------------------------------------------------------
-- appointments
--   Scheduled meetings. Synced with Google Calendar.
-- -----------------------------------------------------------------------------
CREATE TABLE appointments (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                  -- V2 stub
    account_id      BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    type            TEXT NOT NULL CHECK (type IN (
                        'prospecting',
                        'presentation',
                        'checkin',
                        'training'
                    )),

    title           TEXT,                    -- human-readable; defaults to "<type> — <account>"
    location        TEXT,                    -- free text (can differ from account address)

    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,

    -- Google Calendar linkage (nullable until synced)
    google_calendar_id       TEXT,
    google_event_id          TEXT,

    -- Outcome (filled after completion)
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    outcome         TEXT CHECK (outcome IN ('good', 'neutral', 'bad', NULL)),
    outcome_notes   TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT appointments_time_valid CHECK (ends_at > starts_at)
);

CREATE INDEX idx_appointments_account   ON appointments(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_starts    ON appointments(starts_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_appointments_google_event
    ON appointments(google_event_id) WHERE google_event_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- appointment_contacts
--   Many-to-many: which contacts attended/are attending an appointment.
-- -----------------------------------------------------------------------------
CREATE TABLE appointment_contacts (
    appointment_id  BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    contact_id      BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    attended        BOOLEAN,                 -- NULL until appointment completed
    PRIMARY KEY (appointment_id, contact_id)
);


-- =============================================================================
-- TRIPS & ROUTE PLANNING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trips
--   A planned visit route over one or more days.
-- -----------------------------------------------------------------------------
CREATE TABLE trips (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT,              -- V2 stub

    name                TEXT NOT NULL,       -- "DFW North Suburbs — May W2"
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,

    -- Daily working window (same for every day in the trip for V1;
    -- per-day overrides can be added to a trip_days table later)
    daily_start_time    TIME NOT NULL DEFAULT '09:00',
    daily_end_time      TIME NOT NULL DEFAULT '17:00',

    -- Home base (drives start/end of each day's route)
    home_location       GEOGRAPHY(POINT, 4326),
    home_address        TEXT,

    -- Default per-stop duration (individual stops can override)
    default_stop_minutes INT NOT NULL DEFAULT 45,

    status              TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
                            'planning', 'active', 'completed', 'cancelled'
                        )),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT trips_dates_valid CHECK (end_date >= start_date),
    CONSTRAINT trips_times_valid CHECK (daily_end_time > daily_start_time)
);

CREATE INDEX idx_trips_dates    ON trips(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_status   ON trips(status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- trip_stops
--   One account-visit within a trip. Ordered, with planned and actual times.
-- -----------------------------------------------------------------------------
CREATE TABLE trip_stops (
    id                      BIGSERIAL PRIMARY KEY,
    trip_id                 BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    account_id              BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    appointment_id          BIGINT REFERENCES appointments(id) ON DELETE SET NULL,

    -- Planning
    stop_date               DATE NOT NULL,   -- which day of the trip
    sequence                INT NOT NULL,    -- order within that day (1,2,3...)
    scheduled_arrival       TIMESTAMPTZ,
    scheduled_duration_min  INT NOT NULL DEFAULT 45,

    -- Execution (filled in the field)
    actual_arrival          TIMESTAMPTZ,
    actual_departure        TIMESTAMPTZ,
    visit_logged            BOOLEAN NOT NULL DEFAULT FALSE,
    -- When visit_logged flips TRUE, we also insert an interactions row of type='visit'
    -- The interaction carries the outcome/tags/notes; trip_stops just tracks the plan.

    skipped                 BOOLEAN NOT NULL DEFAULT FALSE,
    skip_reason             TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (trip_id, stop_date, sequence)
);

CREATE INDEX idx_trip_stops_trip        ON trip_stops(trip_id, stop_date, sequence);
CREATE INDEX idx_trip_stops_account     ON trip_stops(account_id);
CREATE INDEX idx_trip_stops_date        ON trip_stops(stop_date);

CREATE TRIGGER trg_trip_stops_updated_at
    BEFORE UPDATE ON trip_stops
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- OUTREACH
-- =============================================================================

-- -----------------------------------------------------------------------------
-- outreach_templates
--   Reusable email templates. V1 ships with the High Point Market template.
-- -----------------------------------------------------------------------------
CREATE TABLE outreach_templates (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                  -- V2 stub
    name            TEXT NOT NULL,
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,           -- may contain {{first_name}} etc. placeholders
    description     TEXT,
    active          BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER trg_outreach_templates_updated_at
    BEFORE UPDATE ON outreach_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- outreach_batches
--   A group of emails Bronson is preparing to send together.
--   Lifecycle: draft -> recipient_confirmed -> drafting -> reviewing -> sending -> sent
-- -----------------------------------------------------------------------------
CREATE TABLE outreach_batches (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                  -- V2 stub

    name            TEXT NOT NULL,
    template_id     BIGINT REFERENCES outreach_templates(id) ON DELETE SET NULL,
    -- If template_id is NULL, the batch was built from a custom prompt, stored here:
    custom_prompt   TEXT,

    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'draft',              -- batch created, no recipients yet
                        'recipient_confirmed',-- Bronson approved the recipient list
                        'drafting',           -- AI is generating per-recipient drafts
                        'reviewing',          -- drafts ready for Bronson to review
                        'sending',            -- approved drafts are queued/sending
                        'sent',               -- all approved drafts done
                        'cancelled'
                    )),

    -- Timing
    send_spacing_seconds INT NOT NULL DEFAULT 90,  -- delay between sends in a batch

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT outreach_batch_source CHECK (
        template_id IS NOT NULL OR custom_prompt IS NOT NULL
    )
);

CREATE INDEX idx_outreach_batches_status ON outreach_batches(status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_outreach_batches_updated_at
    BEFORE UPDATE ON outreach_batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- outreach_drafts
--   One row per recipient per batch. The unit of review/approval/send.
-- -----------------------------------------------------------------------------
CREATE TABLE outreach_drafts (
    id                  BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT NOT NULL REFERENCES outreach_batches(id) ON DELETE CASCADE,
    account_id          BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    contact_id          BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Drafted content (editable by Bronson before approval)
    subject             TEXT NOT NULL,
    body                TEXT NOT NULL,

    status              TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
                            'pending_review',
                            'approved',
                            'skipped',
                            'sending',
                            'sent',
                            'failed'
                        )),

    -- Send result
    sent_at             TIMESTAMPTZ,
    gmail_message_id    TEXT,
    gmail_thread_id     TEXT,
    failure_reason      TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    -- Principle: one email per recipient per batch. Hard-enforced.
    UNIQUE (batch_id, contact_id)
);

CREATE INDEX idx_outreach_drafts_batch    ON outreach_drafts(batch_id);
CREATE INDEX idx_outreach_drafts_status   ON outreach_drafts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_outreach_drafts_account  ON outreach_drafts(account_id);

CREATE TRIGGER trg_outreach_drafts_updated_at
    BEFORE UPDATE ON outreach_drafts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- TAGS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tags
--   Freeform labels usable on accounts and interactions.
-- -----------------------------------------------------------------------------
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,                      -- V2 stub
    name        TEXT NOT NULL,
    color       TEXT,                        -- hex color for UI chips
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    UNIQUE (user_id, name)
);

CREATE TABLE account_tags (
    account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (account_id, tag_id)
);

CREATE TABLE interaction_tags (
    interaction_id  BIGINT NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    tag_id          BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (interaction_id, tag_id)
);


-- =============================================================================
-- INTEGRATIONS & SYSTEM
-- =============================================================================

-- -----------------------------------------------------------------------------
-- oauth_tokens
--   Google OAuth credentials (Gmail + Calendar). Single row for V1 (Bronson).
--   Tokens should be encrypted at rest — encryption is handled at app layer
--   before INSERT. V2 will key this by user_id.
-- -----------------------------------------------------------------------------
CREATE TABLE oauth_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT,              -- V2 stub
    provider            TEXT NOT NULL CHECK (provider IN ('google')),
    scope               TEXT NOT NULL,       -- space-separated scopes granted
    access_token_enc    TEXT NOT NULL,       -- app-layer encrypted
    refresh_token_enc   TEXT NOT NULL,       -- app-layer encrypted
    expires_at          TIMESTAMPTZ NOT NULL,
    google_account_email CITEXT,             -- which Google account this is for

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);

CREATE TRIGGER trg_oauth_tokens_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- sync_state
--   Tracks where we are in polling Gmail for replies, Calendar for changes, etc.
--   Key-value shape for flexibility.
-- -----------------------------------------------------------------------------
CREATE TABLE sync_state (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,                  -- V2 stub
    kind            TEXT NOT NULL,           -- e.g. 'gmail_history_id', 'calendar_sync_token'
    value           TEXT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, kind)
);

CREATE TRIGGER trg_sync_state_updated_at
    BEFORE UPDATE ON sync_state
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- audit_log
--   Append-only trail of sensitive actions (email sends, data exports,
--   OAuth grants, stage changes). Never soft-deleted; never updated.
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,                      -- V2 stub
    action      TEXT NOT NULL,               -- e.g. 'outreach.sent', 'account.stage_changed'
    entity_type TEXT,                        -- e.g. 'account', 'outreach_draft'
    entity_id   BIGINT,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_action       ON audit_log(action, occurred_at DESC);
CREATE INDEX idx_audit_log_entity       ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_occurred     ON audit_log(occurred_at DESC);


-- =============================================================================
-- SEED DATA (V1)
-- =============================================================================

-- Approved High Point Market outreach template
INSERT INTO outreach_templates (name, subject, body, description) VALUES (
    'High Point Market — Invitation',
    'Heading to High Point this market?',
$body$Are you heading to High Point this market (April 20–29)? I'll be there with Lexington and have open appointments daily from 9am–5pm. Would love to show you what's new — just reply with a day and time that works and I'll get it on the books.

Bronson Prachyl
Lexington Furniture
214-789-9107
bprachyl@lexington.com$body$,
    'Approved verbatim. Used for pre-market outreach to designers/retailers.'
);


-- =============================================================================
-- END OF MIGRATION 0001
-- =============================================================================

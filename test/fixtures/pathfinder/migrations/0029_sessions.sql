-- =============================================================================
-- Migration 0029 — Sessions (Auth, PATHFINDER_SPEC_AUTH_AND_DEPLOY.md §1.1)
--
-- Server-side sessions for Google OAuth login. Until now `authMiddleware` has been
-- the M1 placeholder that 401s every request in production — the app was not merely
-- insecure, it was unusable when deployed. This is the table that fixes that.
--
-- Three deliberate departures from the usual table conventions, each for a reason:
--
--   1. NO `deleted_at`, and no soft delete. Every business table soft-deletes (§6.2),
--      but a session is not business data — it is a live credential. "Revoked" must
--      mean GONE: a soft-deleted session row is one forgotten `deleted_at IS NULL`
--      away from being a valid login again, and logout is the exact operation a rep
--      performs when they believe a device is compromised. Rows are hard-DELETEd.
--
--   2. `user_id` is a REAL FK with ON DELETE CASCADE, not the nullable FK-less V2
--      stub (§6.2). That rule exists so business rows can be re-keyed to a tenant in
--      V2 without a rewrite. A session is meaningless without its user and must die
--      with it, so the FK is the correct constraint here and the cascade is load-
--      bearing rather than decorative (this table is genuinely hard-deleted, so
--      unlike the rest of the schema the cascade will actually fire).
--
--   3. We store a HASH of the session token, never the token. The cookie holds the
--      only copy of the raw value. A database leak — a stolen backup, a `pg_dump` in
--      the wrong place, an errant log — therefore hands an attacker no usable
--      sessions. This is the same reasoning as storing password hashes, and it costs
--      nothing: lookup is by exact hash, so it is still a single indexed equality.
--
-- The db-migrate runner wraps each file in a single transaction; no BEGIN/COMMIT here.
-- =============================================================================

CREATE TABLE sessions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- SHA-256 of the raw token, hex-encoded (64 chars). UNIQUE both to enforce the
    -- obvious invariant and to give the lookup index the auth path hits on EVERY
    -- authenticated request — this is the hottest query in the app once login exists.
    token_hash          TEXT NOT NULL UNIQUE,

    -- Sliding expiry: refreshed on use (see touchSession). A rep re-authenticating
    -- in a parking lot because their session aged out mid-week is a self-inflicted
    -- wound, so the default window is generous (SESSION_TTL_DAYS, default 30).
    expires_at          TIMESTAMPTZ NOT NULL,

    -- Coarse audit trail. Deliberately NOT the full user-agent string or a precise
    -- IP history: this is a single-rep app and storing a device fingerprint would be
    -- collecting personal data we have no use for (§3.4).
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Serves the expired-session sweep (deleteExpiredSessions). Without it that job
-- seq-scans, which is harmless at one user and rude at scale. Partial indexes are
-- no help here — the predicate is a moving NOW() comparison, not a constant.
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- Serves "log out everywhere" and the FK cascade's own lookup.
CREATE INDEX idx_sessions_user ON sessions (user_id);

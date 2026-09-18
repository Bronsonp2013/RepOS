-- Manual "pin" (soft anchor) on a trip stop.
-- A pin freezes a stop at the day + time window it currently holds when the rep
-- taps pin — the window is captured automatically (no time-picker). This is
-- distinct from appointment_id (the hard anchor): on a conflict the appointment
-- always wins its exact time and the pin yields to it (see 2c-iii spec).
--
-- Precedence in the optimizer: appointment (hard anchor) > pin (soft anchor) > free.
--
-- pinned_at NULL  = the stop is not pinned.
-- pinned_window_start  = the arrival the stop held at pin time (real UTC).
-- pinned_window_minutes = the dwell it held at pin time.

BEGIN;

ALTER TABLE trip_stops ADD COLUMN pinned_at             TIMESTAMPTZ;
ALTER TABLE trip_stops ADD COLUMN pinned_window_start   TIMESTAMPTZ;
ALTER TABLE trip_stops ADD COLUMN pinned_window_minutes INT;

COMMIT;

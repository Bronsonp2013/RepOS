-- Redesign trips for dynamic starting position.
-- The original model assumed a fixed home base (home_location/home_address) with
-- return-to-home logic. Real reps start from wherever they are and don't return
-- home between days. This migration removes the wrong columns and adds the correct
-- ones. Existing trip rows were built on the wrong model and are deleted first.

BEGIN;

-- Remove broken trip data (home-base model is wrong; no rows worth keeping)
DELETE FROM trip_stops;
DELETE FROM trips;

ALTER TABLE trips DROP COLUMN IF EXISTS home_location;
ALTER TABLE trips DROP COLUMN IF EXISTS home_address;

-- starting_location: PostGIS point for the rep's position at the start of day 1.
-- starting_address: human-readable label, optional, used for display only.
ALTER TABLE trips ADD COLUMN starting_location GEOGRAPHY(POINT, 4326);
ALTER TABLE trips ADD COLUMN starting_address TEXT;

COMMIT;

-- Built-in Postgres extensions for distance math on a round earth.
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Lets "what flew within 2 km of this address?" use an index
-- instead of measuring the distance to every stored position.
CREATE INDEX positions_location_idx ON positions USING gist (ll_to_earth(latitude, longitude));

-- Following one aircraft's path over time.
CREATE INDEX positions_icao24_time_idx ON positions (icao24, observed_at);

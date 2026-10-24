-- Every aircraft we have ever seen, keyed by its unique transponder address.
CREATE TABLE aircraft (
    icao24          CHAR(6)     PRIMARY KEY,
    last_callsign   TEXT,
    origin_country  TEXT,
    first_seen      TIMESTAMPTZ NOT NULL,
    last_seen       TIMESTAMPTZ NOT NULL
);

-- One row per position report. This table grows fast (hundreds of thousands of rows a day).
CREATE TABLE positions (
    id               BIGSERIAL   PRIMARY KEY,
    icao24           CHAR(6)     NOT NULL REFERENCES aircraft (icao24),
    callsign         TEXT,
    observed_at      TIMESTAMPTZ NOT NULL,
    latitude         DOUBLE PRECISION NOT NULL,
    longitude        DOUBLE PRECISION NOT NULL,
    baro_altitude_m  REAL,
    geo_altitude_m   REAL,
    velocity_ms      REAL,
    heading_deg      REAL,
    vertical_rate_ms REAL,
    on_ground        BOOLEAN     NOT NULL,
    squawk           TEXT,
    category         SMALLINT,
    -- The same report can show up in two polls; this makes saving it twice harmless.
    UNIQUE (icao24, observed_at)
);

-- Speeds up "what's in the air right now?" and time-range stats.
CREATE INDEX positions_observed_at_idx ON positions (observed_at);

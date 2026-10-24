-- Remembers how far the nightly cleanup has thinned out old positions,
-- so each run picks up where the last one stopped (even after missed nights).
CREATE TABLE retention_progress (
    id            BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id), -- only ever one row
    thinned_until TIMESTAMPTZ
);

INSERT INTO retention_progress (id, thinned_until) VALUES (TRUE, NULL);

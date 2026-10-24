package com.michaelkokaly.flighttracker.ingest;

import java.sql.Timestamp;
import java.util.List;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.michaelkokaly.flighttracker.opensky.StateVector;

@Repository
public class PositionRepository {

	private static final String UPSERT_AIRCRAFT = """
			INSERT INTO aircraft (icao24, last_callsign, origin_country, first_seen, last_seen)
			VALUES (:icao24, :callsign, :originCountry, :observedAt, :observedAt)
			ON CONFLICT (icao24) DO UPDATE SET
			    last_callsign  = COALESCE(EXCLUDED.last_callsign, aircraft.last_callsign),
			    origin_country = EXCLUDED.origin_country,
			    last_seen      = GREATEST(aircraft.last_seen, EXCLUDED.last_seen)
			""";

	private static final String INSERT_POSITION = """
			INSERT INTO positions (icao24, callsign, observed_at, latitude, longitude, baro_altitude_m,
			                       geo_altitude_m, velocity_ms, heading_deg, vertical_rate_ms, on_ground, squawk, category)
			VALUES (:icao24, :callsign, :observedAt, :latitude, :longitude, :baroAltitude,
			        :geoAltitude, :velocity, :heading, :verticalRate, :onGround, :squawk, :category)
			ON CONFLICT (icao24, observed_at) DO NOTHING
			""";

	private final NamedParameterJdbcTemplate jdbc;

	public PositionRepository(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	/** Saves one poll's worth of reports in two batched statements. Returns how many new positions were stored. */
	@Transactional
	public int saveAll(List<StateVector> states) {
		if (states.isEmpty()) {
			return 0;
		}
		SqlParameterSource[] params = states.stream().map(PositionRepository::toParams).toArray(SqlParameterSource[]::new);
		jdbc.batchUpdate(UPSERT_AIRCRAFT, params);
		int inserted = 0;
		for (int count : jdbc.batchUpdate(INSERT_POSITION, params)) {
			inserted += Math.max(count, 0);
		}
		return inserted;
	}

	private static SqlParameterSource toParams(StateVector s) {
		return new MapSqlParameterSource()
				.addValue("icao24", s.icao24())
				.addValue("callsign", s.callsign())
				.addValue("originCountry", s.originCountry())
				.addValue("observedAt", Timestamp.from(s.observedAt()))
				.addValue("latitude", s.latitude())
				.addValue("longitude", s.longitude())
				.addValue("baroAltitude", s.baroAltitude())
				.addValue("geoAltitude", s.geoAltitude())
				.addValue("velocity", s.velocity())
				.addValue("heading", s.heading())
				.addValue("verticalRate", s.verticalRate())
				.addValue("onGround", s.onGround())
				.addValue("squawk", s.squawk())
				.addValue("category", s.category());
	}
}

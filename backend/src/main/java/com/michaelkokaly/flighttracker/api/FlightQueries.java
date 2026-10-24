package com.michaelkokaly.flighttracker.api;

import java.time.Duration;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class FlightQueries {

	/** Pulls the airline code out of a callsign like "UAL123" and looks up its name. */
	private static final String AIRLINE_JOIN = """
			LEFT JOIN airlines al ON al.code = substring(p.callsign FROM '^([A-Z]{3})[0-9]')
			""";

	private final JdbcClient jdbc;

	public FlightQueries(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/** The most recent position of every aircraft heard from within the given window. */
	public List<LivePlane> livePlanes(Duration maxAge) {
		return jdbc.sql("""
				SELECT DISTINCT ON (p.icao24)
				       p.icao24, p.callsign, al.name AS airline, a.origin_country, p.observed_at,
				       p.latitude, p.longitude, COALESCE(p.geo_altitude_m, p.baro_altitude_m) AS altitude_m,
				       p.velocity_ms, p.heading_deg, p.vertical_rate_ms, p.on_ground
				FROM positions p
				JOIN aircraft a ON a.icao24 = p.icao24
				""" + AIRLINE_JOIN + """
				WHERE p.observed_at > now() - make_interval(secs => :seconds)
				ORDER BY p.icao24, p.observed_at DESC
				""")
				.param("seconds", maxAge.toSeconds())
				.query(LivePlane.class)
				.list();
	}

	/** Every stored position for one aircraft, oldest first, so it can be drawn as a line. */
	public List<TrackPoint> track(String icao24, Duration lookback) {
		return jdbc.sql("""
				SELECT observed_at, latitude, longitude,
				       COALESCE(geo_altitude_m, baro_altitude_m) AS altitude_m, on_ground
				FROM positions
				WHERE icao24 = :icao24 AND observed_at > now() - make_interval(secs => :seconds)
				ORDER BY observed_at
				""")
				.param("icao24", icao24)
				.param("seconds", lookback.toSeconds())
				.query(TrackPoint.class)
				.list();
	}

	/**
	 * Aircraft that passed within a radius of a point, with how close each one got.
	 * earth_box narrows the search with the location index; earth_distance then trims the corners.
	 */
	public List<Overhead> overhead(double lat, double lon, double radiusMeters, Duration lookback) {
		return jdbc.sql("""
				SELECT * FROM (
				    SELECT DISTINCT ON (p.icao24)
				           p.icao24, p.callsign, al.name AS airline, p.observed_at,
				           COALESCE(p.geo_altitude_m, p.baro_altitude_m) AS altitude_m,
				           earth_distance(ll_to_earth(:lat, :lon), ll_to_earth(p.latitude, p.longitude)) AS distance_m
				    FROM positions p
				""" + AIRLINE_JOIN + """
				    WHERE earth_box(ll_to_earth(:lat, :lon), :radius) @> ll_to_earth(p.latitude, p.longitude)
				      AND earth_distance(ll_to_earth(:lat, :lon), ll_to_earth(p.latitude, p.longitude)) <= :radius
				      AND p.observed_at > now() - make_interval(secs => :seconds)
				      AND NOT p.on_ground
				    ORDER BY p.icao24, distance_m
				) closest
				ORDER BY observed_at DESC
				""")
				.param("lat", lat)
				.param("lon", lon)
				.param("radius", radiusMeters)
				.param("seconds", lookback.toSeconds())
				.query(Overhead.class)
				.list();
	}
}

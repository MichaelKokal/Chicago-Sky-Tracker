package com.michaelkokaly.flighttracker.api;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class StatsQueries {

	private final JdbcClient jdbc;

	public StatsQueries(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	public Summary summary() {
		return jdbc.sql("""
				SELECT (SELECT count(*) FROM positions)                                        AS total_positions,
				       (SELECT count(*) FROM aircraft)                                         AS total_aircraft,
				       (SELECT count(*) FROM aircraft WHERE last_seen > now() - interval '24 hours') AS aircraft_last24h,
				       (SELECT min(observed_at) FROM positions)                                AS tracking_since
				""")
				.query(Summary.class)
				.single();
	}

	/** How many different aircraft were seen in each hour of the day, Chicago time. */
	public List<HourCount> byHourOfDay(int days) {
		return jdbc.sql("""
				SELECT extract(hour FROM observed_at AT TIME ZONE 'America/Chicago')::int AS hour,
				       count(DISTINCT icao24) / greatest(count(DISTINCT date_trunc('day', observed_at AT TIME ZONE 'America/Chicago')), 1)
				           AS avg_aircraft
				FROM positions
				WHERE observed_at > now() - make_interval(days => :days)
				GROUP BY hour
				ORDER BY hour
				""")
				.param("days", days)
				.query(HourCount.class)
				.list();
	}

	/** Airlines ranked by how many separate aircraft they flew through the area. */
	public List<AirlineCount> topAirlines(int days, int limit) {
		return jdbc.sql("""
				SELECT COALESCE(al.name, 'Private & other') AS airline,
				       count(DISTINCT p.icao24)                 AS aircraft
				FROM positions p
				LEFT JOIN airlines al ON al.code = substring(p.callsign FROM '^([A-Z]{3})[0-9]')
				WHERE p.observed_at > now() - make_interval(days => :days)
				GROUP BY 1
				ORDER BY aircraft DESC
				LIMIT :limit
				""")
				.param("days", days)
				.param("limit", limit)
				.query(AirlineCount.class)
				.list();
	}

	public record Summary(long totalPositions, long totalAircraft, long aircraftLast24h, java.time.Instant trackingSince) {
	}

	public record HourCount(int hour, long avgAircraft) {
	}

	public record AirlineCount(String airline, long aircraft) {
	}
}

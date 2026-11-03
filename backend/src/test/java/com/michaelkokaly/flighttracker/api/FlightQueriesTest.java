package com.michaelkokaly.flighttracker.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import com.michaelkokaly.flighttracker.ingest.PositionRepository;
import com.michaelkokaly.flighttracker.opensky.StateVector;

@SpringBootTest
@ActiveProfiles("test")
class FlightQueriesTest {

	private static final Instant T = Instant.parse("2026-10-24T12:00:00Z");
	private static final Duration WINDOW = Duration.ofSeconds(90);

	@Autowired
	FlightQueries queries;

	@Autowired
	PositionRepository positions;

	@Autowired
	JdbcClient jdbc;

	@BeforeEach
	void emptyTables() {
		jdbc.sql("TRUNCATE positions, aircraft").update();
	}

	@Test
	void planesAtReturnsEachPlanesLatestPositionBeforeThatMoment() {
		positions.saveAll(List.of(
				report("aaaaaa", "UAL1", T.minusSeconds(60), 41.0, "7700"),
				report("aaaaaa", "UAL1", T.minusSeconds(30), 41.1, "7700"),
				// After the moment we asked about, so it must not be used.
				report("aaaaaa", "UAL1", T.plusSeconds(30), 41.2, "7700"),
				// Too long before the moment: this plane had already left.
				report("bbbbbb", "SWA2", T.minusSeconds(600), 42.0, null)));

		List<LivePlane> planes = queries.planesAt(T, WINDOW);

		assertThat(planes).hasSize(1);
		LivePlane plane = planes.getFirst();
		assertThat(plane.icao24()).isEqualTo("aaaaaa");
		assertThat(plane.latitude()).isEqualTo(41.1);
		assertThat(plane.airline()).isEqualTo("United Airlines");
		assertThat(plane.squawk()).isEqualTo("7700");
		assertThat(plane.category()).isEqualTo(4);
	}

	@Test
	void trackStopsAtTheGivenMomentAndIncludesSpeed() {
		positions.saveAll(List.of(
				report("aaaaaa", "UAL1", T.minusSeconds(60), 41.0, null),
				report("aaaaaa", "UAL1", T.minusSeconds(30), 41.1, null),
				report("aaaaaa", "UAL1", T.plusSeconds(30), 41.2, null)));

		List<TrackPoint> track = queries.track("aaaaaa", T, Duration.ofHours(1));

		assertThat(track).extracting(TrackPoint::latitude).containsExactly(41.0, 41.1);
		assertThat(track.getFirst().velocityMs()).isEqualTo(200.0);
	}

	private static StateVector report(String icao24, String callsign, Instant at, double lat, String squawk) {
		return new StateVector(icao24, callsign, "United States", at, -87.9, lat, 3000.0, false, 200.0, 90.0, 0.0,
				3000.0, squawk, 4);
	}
}

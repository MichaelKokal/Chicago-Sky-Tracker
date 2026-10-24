package com.michaelkokaly.flighttracker.retention;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
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
class RetentionJobTest {

	private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");

	@Autowired
	RetentionJob job;

	@Autowired
	PositionRepository positions;

	@Autowired
	JdbcClient jdbc;

	@BeforeEach
	void emptyTables() {
		jdbc.sql("TRUNCATE positions, aircraft").update();
		jdbc.sql("UPDATE retention_progress SET thinned_until = NULL").update();
	}

	@Test
	void thinsOldDataKeepsRecentDataAndDeletesExpiredData() {
		// 10 days ago: 20 reports, 30 seconds apart. Thinned to one per 2 minutes = 5 kept.
		positions.saveAll(reports("aaaaaa", NOW.minus(Duration.ofDays(10)).minusSeconds(3600 * 6), 20));
		// Yesterday: 4 reports. Inside the full-detail window, so all kept.
		positions.saveAll(reports("aaaaaa", NOW.minus(Duration.ofDays(1)), 4));
		// 100 days ago: past the keep window, so deleted along with the aircraft.
		positions.saveAll(reports("bbbbbb", NOW.minus(Duration.ofDays(100)), 1));

		RetentionJob.Result result = job.run(NOW);

		assertThat(result.deletedPositions()).isEqualTo(1);
		assertThat(result.deletedAircraft()).isEqualTo(1);
		assertThat(result.thinnedPositions()).isEqualTo(15);
		assertThat(count("SELECT count(*) FROM positions WHERE icao24 = 'aaaaaa'")).isEqualTo(5 + 4);
		assertThat(count("SELECT count(*) FROM aircraft WHERE icao24 = 'bbbbbb'")).isZero();
	}

	@Test
	void secondRunPicksUpWhereTheFirstStopped() {
		positions.saveAll(reports("aaaaaa", NOW.minus(Duration.ofDays(10)).minusSeconds(3600 * 6), 20));
		job.run(NOW);

		RetentionJob.Result again = job.run(NOW);

		assertThat(again.thinnedPositions()).isZero();
		assertThat(count("SELECT count(*) FROM positions")).isEqualTo(5);
	}

	private long count(String sql) {
		return jdbc.sql(sql).query(Long.class).single();
	}

	/** Reports for one aircraft, 30 seconds apart, starting at a time aligned to a 2 minute bucket. */
	private static List<StateVector> reports(String icao24, Instant start, int count) {
		Instant aligned = Instant.ofEpochSecond(start.getEpochSecond() / 120 * 120);
		List<StateVector> reports = new ArrayList<>();
		for (int i = 0; i < count; i++) {
			reports.add(new StateVector(icao24, "TEST1", "United States", aligned.plusSeconds(30L * i),
					-87.9, 41.9, 3000.0, false, 200.0, 90.0, 0.0, 3000.0, null, null));
		}
		return reports;
	}
}

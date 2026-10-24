package com.michaelkokaly.flighttracker.retention;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Keeps the database from growing forever. Runs every night:
 * 1. Deletes positions (and aircraft) older than the keep window.
 * 2. Thins out positions older than the full-detail window to one per aircraft per interval.
 */
@Component
public class RetentionJob {

	private static final Logger log = LoggerFactory.getLogger(RetentionJob.class);

	// Within each aircraft's time bucket, keep the earliest position and delete the rest.
	private static final String THIN_HOUR = """
			DELETE FROM positions p
			USING (
			    SELECT id, row_number() OVER (
			               PARTITION BY icao24, date_bin(make_interval(secs => :bucketSeconds), observed_at, TIMESTAMPTZ '2000-01-01')
			               ORDER BY observed_at) AS position_in_bucket
			    FROM positions
			    WHERE observed_at >= :from AND observed_at < :to
			) ranked
			WHERE p.id = ranked.id AND ranked.position_in_bucket > 1
			""";

	private final JdbcClient jdbc;
	private final TransactionTemplate transactions;
	private final RetentionProperties properties;

	public RetentionJob(JdbcClient jdbc, TransactionTemplate transactions, RetentionProperties properties) {
		this.jdbc = jdbc;
		this.transactions = transactions;
		this.properties = properties;
	}

	@Scheduled(cron = "${retention.cron}", zone = "America/Chicago")
	public void runNightly() {
		run(Instant.now());
	}

	public Result run(Instant now) {
		long started = System.currentTimeMillis();
		// Delete first, so thinning doesn't waste time on rows that are about to be removed anyway.
		long[] purged = purgeExpired(now);
		long thinned = thinOldPositions(now);
		Result result = new Result(thinned, purged[0], purged[1]);
		log.info("Cleanup finished in {} ms: thinned {} positions, deleted {} expired positions and {} aircraft",
				System.currentTimeMillis() - started, result.thinnedPositions(), result.deletedPositions(),
				result.deletedAircraft());
		return result;
	}

	/** Works one hour at a time so each delete stays small and the poller is never blocked for long. */
	private long thinOldPositions(Instant now) {
		Instant cutoff = now.minus(properties.fullDetail()).truncatedTo(ChronoUnit.HOURS);
		Instant from = startOfThinning();
		if (from == null) {
			return 0;
		}

		long total = 0;
		while (from.isBefore(cutoff)) {
			Instant hourStart = from;
			Instant hourEnd = min(hourStart.plus(Duration.ofHours(1)), cutoff);
			total += transactions.execute(status -> {
				int deleted = jdbc.sql(THIN_HOUR)
						.param("bucketSeconds", properties.thinInterval().toSeconds())
						.param("from", Timestamp.from(hourStart))
						.param("to", Timestamp.from(hourEnd))
						.update();
				jdbc.sql("UPDATE retention_progress SET thinned_until = :until")
						.param("until", Timestamp.from(hourEnd))
						.update();
				return deleted;
			});
			from = hourEnd;
		}
		return total;
	}

	/** Where thinning should resume: the saved progress, or the oldest position if this is the first run. */
	private Instant startOfThinning() {
		return jdbc.sql("""
				SELECT COALESCE(
				    (SELECT thinned_until FROM retention_progress),
				    date_trunc('hour', (SELECT min(observed_at) FROM positions)))
				""")
				.query(Timestamp.class)
				.optional()
				.map(Timestamp::toInstant)
				.orElse(null);
	}

	private long[] purgeExpired(Instant now) {
		Timestamp cutoff = Timestamp.from(now.minus(properties.keep()));
		return transactions.execute(status -> {
			long positions = jdbc.sql("DELETE FROM positions WHERE observed_at < :cutoff")
					.param("cutoff", cutoff)
					.update();
			long aircraft = jdbc.sql("""
					DELETE FROM aircraft a
					WHERE a.last_seen < :cutoff
					  AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.icao24 = a.icao24)
					""")
					.param("cutoff", cutoff)
					.update();
			return new long[] { positions, aircraft };
		});
	}

	private static Instant min(Instant a, Instant b) {
		return a.isBefore(b) ? a : b;
	}

	public record Result(long thinnedPositions, long deletedPositions, long deletedAircraft) {
	}
}

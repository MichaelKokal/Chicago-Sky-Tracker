package com.michaelkokaly.flighttracker.api;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.michaelkokaly.flighttracker.opensky.OpenSkyProperties;
import com.michaelkokaly.flighttracker.retention.RetentionProperties;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api")
public class FlightController {

	private final FlightQueries queries;
	private final RetentionProperties retention;
	private final Duration liveWindow;

	public FlightController(FlightQueries queries, OpenSkyProperties properties, RetentionProperties retention) {
		this.queries = queries;
		this.retention = retention;
		// A plane counts as "live" if we heard from it in the last two polls (plus some slack).
		this.liveWindow = properties.pollInterval().multipliedBy(2).plusSeconds(30);
	}

	@GetMapping("/flights/live")
	public List<LivePlane> live() {
		return queries.livePlanes(liveWindow);
	}

	/** The map as it looked at a moment in the past. */
	@GetMapping("/flights/playback")
	public List<LivePlane> playback(@RequestParam Instant at) {
		Instant now = Instant.now();
		if (at.isAfter(now) || at.isBefore(now.minus(retention.keep()))) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Playback is only available for the last " + retention.keep().toDays() + " days");
		}
		return queries.planesAt(at, windowAt(at, now));
	}

	/** One aircraft's path, ending now or at a playback moment. */
	@GetMapping("/flights/{icao24}/track")
	public List<TrackPoint> track(
			@PathVariable @Pattern(regexp = "[0-9a-f]{6}") String icao24,
			@RequestParam(defaultValue = "6") @Min(1) @Max(72) int hours,
			@RequestParam(required = false) Instant until) {
		return queries.track(icao24, until == null ? Instant.now() : until, Duration.ofHours(hours));
	}

	@GetMapping("/overhead")
	public List<Overhead> overhead(
			@RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
			@RequestParam @DecimalMin("-180") @DecimalMax("180") double lon,
			@RequestParam(defaultValue = "2") @DecimalMin("0.1") @DecimalMax("25") double radiusKm,
			@RequestParam(defaultValue = "24") @Min(1) @Max(168) int hours) {
		return queries.overhead(lat, lon, radiusKm * 1000, Duration.ofHours(hours));
	}

	/**
	 * How far back to look for each plane's position. Older data has been thinned to one position
	 * every few minutes, so the window has to be wide enough to still catch every plane.
	 */
	private Duration windowAt(Instant at, Instant now) {
		if (at.isBefore(now.minus(retention.fullDetail()))) {
			return retention.thinInterval().plusSeconds(30);
		}
		return liveWindow;
	}
}

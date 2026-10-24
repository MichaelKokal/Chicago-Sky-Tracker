package com.michaelkokaly.flighttracker.api;

import java.time.Duration;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.michaelkokaly.flighttracker.opensky.OpenSkyProperties;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api")
public class FlightController {

	private final FlightQueries queries;
	private final Duration liveWindow;

	public FlightController(FlightQueries queries, OpenSkyProperties properties) {
		this.queries = queries;
		// A plane counts as "live" if we heard from it in the last two polls (plus some slack).
		this.liveWindow = properties.pollInterval().multipliedBy(2).plusSeconds(30);
	}

	@GetMapping("/flights/live")
	public List<LivePlane> live() {
		return queries.livePlanes(liveWindow);
	}

	@GetMapping("/flights/{icao24}/track")
	public List<TrackPoint> track(
			@PathVariable @Pattern(regexp = "[0-9a-f]{6}") String icao24,
			@RequestParam(defaultValue = "6") @Min(1) @Max(72) int hours) {
		return queries.track(icao24, Duration.ofHours(hours));
	}

	@GetMapping("/overhead")
	public List<Overhead> overhead(
			@RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
			@RequestParam @DecimalMin("-180") @DecimalMax("180") double lon,
			@RequestParam(defaultValue = "2") @DecimalMin("0.1") @DecimalMax("25") double radiusKm,
			@RequestParam(defaultValue = "24") @Min(1) @Max(168) int hours) {
		return queries.overhead(lat, lon, radiusKm * 1000, Duration.ofHours(hours));
	}
}

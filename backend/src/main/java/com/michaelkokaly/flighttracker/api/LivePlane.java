package com.michaelkokaly.flighttracker.api;

import java.time.Instant;

public record LivePlane(
		String icao24,
		String callsign,
		String airline,
		String originCountry,
		Instant observedAt,
		double latitude,
		double longitude,
		Double altitudeM,
		Double velocityMs,
		Double headingDeg,
		Double verticalRateMs,
		boolean onGround) {
}

package com.michaelkokaly.flighttracker.api;

import java.time.Instant;

/** One aircraft that passed near a point, at the moment it was closest. */
public record Overhead(String icao24, String callsign, String airline, Instant observedAt, Double altitudeM,
		double distanceM) {
}

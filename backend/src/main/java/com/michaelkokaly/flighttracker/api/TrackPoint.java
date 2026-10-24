package com.michaelkokaly.flighttracker.api;

import java.time.Instant;

public record TrackPoint(Instant observedAt, double latitude, double longitude, Double altitudeM, boolean onGround) {
}

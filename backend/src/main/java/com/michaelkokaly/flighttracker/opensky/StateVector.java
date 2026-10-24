package com.michaelkokaly.flighttracker.opensky;

import java.time.Instant;
import java.util.List;

/**
 * One aircraft's position report. OpenSky sends these as a plain JSON array,
 * so the indexes below follow their documented field order.
 */
public record StateVector(
		String icao24,
		String callsign,
		String originCountry,
		Instant observedAt,
		Double longitude,
		Double latitude,
		Double baroAltitude,
		boolean onGround,
		Double velocity,
		Double heading,
		Double verticalRate,
		Double geoAltitude,
		String squawk,
		Integer category) {

	public static StateVector fromArray(List<Object> row) {
		Long timePosition = asLong(row.get(3));
		Long lastContact = asLong(row.get(4));
		long seconds = timePosition != null ? timePosition : lastContact;
		return new StateVector(
				(String) row.get(0),
				trimToNull((String) row.get(1)),
				(String) row.get(2),
				Instant.ofEpochSecond(seconds),
				asDouble(row.get(5)),
				asDouble(row.get(6)),
				asDouble(row.get(7)),
				Boolean.TRUE.equals(row.get(8)),
				asDouble(row.get(9)),
				asDouble(row.get(10)),
				asDouble(row.get(11)),
				asDouble(row.get(13)),
				trimToNull((String) row.get(14)),
				row.size() > 17 ? asInteger(row.get(17)) : null);
	}

	public boolean hasPosition() {
		return latitude != null && longitude != null;
	}

	private static Double asDouble(Object value) {
		return value instanceof Number n ? n.doubleValue() : null;
	}

	private static Long asLong(Object value) {
		return value instanceof Number n ? n.longValue() : null;
	}

	private static Integer asInteger(Object value) {
		return value instanceof Number n ? n.intValue() : null;
	}

	private static String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}

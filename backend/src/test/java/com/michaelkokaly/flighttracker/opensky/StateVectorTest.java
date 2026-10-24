package com.michaelkokaly.flighttracker.opensky;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

class StateVectorTest {

	@Test
	void readsFieldsInOpenSkyOrder() {
		List<Object> row = Arrays.asList("a1b2c3", "UAL123  ", "United States", 1761300000, 1761300002,
				-87.9, 41.98, 3048.0, false, 120.5, 270.0, -5.2, null, 3100.0, "1200", false, 0, 3);

		StateVector state = StateVector.fromArray(row);

		assertThat(state.icao24()).isEqualTo("a1b2c3");
		assertThat(state.callsign()).isEqualTo("UAL123");
		assertThat(state.observedAt()).isEqualTo(Instant.ofEpochSecond(1761300000));
		assertThat(state.latitude()).isEqualTo(41.98);
		assertThat(state.longitude()).isEqualTo(-87.9);
		assertThat(state.baroAltitude()).isEqualTo(3048.0);
		assertThat(state.geoAltitude()).isEqualTo(3100.0);
		assertThat(state.category()).isEqualTo(3);
		assertThat(state.hasPosition()).isTrue();
	}

	@Test
	void fallsBackToLastContactWhenPositionTimeIsMissing() {
		List<Object> row = Arrays.asList("a1b2c3", "", "United States", null, 1761300002,
				null, null, null, true, 0, null, null, null, null, null, false, 0);

		StateVector state = StateVector.fromArray(row);

		assertThat(state.observedAt()).isEqualTo(Instant.ofEpochSecond(1761300002));
		assertThat(state.callsign()).isNull();
		assertThat(state.category()).isNull();
		assertThat(state.hasPosition()).isFalse();
	}
}

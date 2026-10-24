package com.michaelkokaly.flighttracker.ingest;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

import com.michaelkokaly.flighttracker.opensky.OpenSkyClient;
import com.michaelkokaly.flighttracker.opensky.OpenSkyProperties;
import com.michaelkokaly.flighttracker.opensky.StateVector;

@Component
public class PositionPoller {

	private static final Logger log = LoggerFactory.getLogger(PositionPoller.class);

	private final OpenSkyClient openSky;
	private final PositionRepository positions;

	public PositionPoller(OpenSkyClient openSky, PositionRepository positions, OpenSkyProperties properties) {
		this.openSky = openSky;
		this.positions = positions;
		log.info("Polling OpenSky every {} ({})", properties.pollInterval(),
				properties.hasCredentials() ? "signed in" : "anonymous");
	}

	@Scheduled(fixedDelayString = "${opensky.poll-interval}", initialDelay = 0)
	public void poll() {
		try {
			List<StateVector> states = openSky.fetchStates().stream().filter(StateVector::hasPosition).toList();
			int saved = positions.saveAll(states);
			log.info("Saw {} aircraft, stored {} new positions", states.size(), saved);
		} catch (RestClientException e) {
			// Rate limits and network hiccups shouldn't stop the poller; just try again next time.
			log.warn("OpenSky request failed: {}", e.getMessage());
		}
	}
}

package com.michaelkokaly.flighttracker.opensky;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("opensky")
public record OpenSkyProperties(
		String baseUrl,
		String tokenUrl,
		String clientId,
		String clientSecret,
		Duration pollInterval,
		Area area) {

	public OpenSkyProperties {
		if (baseUrl == null) {
			baseUrl = "https://opensky-network.org/api";
		}
		if (tokenUrl == null) {
			tokenUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
		}
	}

	public boolean hasCredentials() {
		return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
	}

	public record Area(double minLat, double maxLat, double minLon, double maxLon) {
	}
}

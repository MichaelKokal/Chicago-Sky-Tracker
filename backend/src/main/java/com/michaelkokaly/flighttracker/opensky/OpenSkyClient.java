package com.michaelkokaly.flighttracker.opensky;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

@Component
public class OpenSkyClient {

	private final OpenSkyProperties properties;
	private final RestClient restClient;

	private String accessToken;
	private Instant tokenExpiresAt = Instant.EPOCH;

	public OpenSkyClient(OpenSkyProperties properties) {
		this.properties = properties;
		this.restClient = RestClient.create();
	}

	/** Fetches every aircraft currently inside the configured area. */
	public List<StateVector> fetchStates() {
		OpenSkyProperties.Area area = properties.area();
		StatesResponse response = restClient.get()
				.uri(properties.baseUrl() + "/states/all?lamin={lamin}&lomin={lomin}&lamax={lamax}&lomax={lomax}&extended=1",
						area.minLat(), area.minLon(), area.maxLat(), area.maxLon())
				.headers(this::addAuthorization)
				.retrieve()
				.body(StatesResponse.class);

		if (response == null || response.states() == null) {
			return List.of();
		}
		return response.states().stream().map(StateVector::fromArray).toList();
	}

	private void addAuthorization(HttpHeaders headers) {
		if (properties.hasCredentials()) {
			headers.setBearerAuth(currentToken());
		}
	}

	/** Tokens last 30 minutes; refresh a minute early so a request never goes out with a stale one. */
	private synchronized String currentToken() {
		if (accessToken == null || Instant.now().isAfter(tokenExpiresAt.minusSeconds(60))) {
			MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
			form.add("grant_type", "client_credentials");
			form.add("client_id", properties.clientId());
			form.add("client_secret", properties.clientSecret());

			Map<?, ?> token = restClient.post()
					.uri(properties.tokenUrl())
					.contentType(MediaType.APPLICATION_FORM_URLENCODED)
					.body(form)
					.retrieve()
					.body(Map.class);

			accessToken = (String) token.get("access_token");
			long expiresIn = ((Number) token.get("expires_in")).longValue();
			tokenExpiresAt = Instant.now().plusSeconds(expiresIn);
		}
		return accessToken;
	}

	record StatesResponse(long time, List<List<Object>> states) {
	}
}

package com.michaelkokaly.flighttracker.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

	private final StatsQueries queries;

	public StatsController(StatsQueries queries) {
		this.queries = queries;
	}

	@GetMapping("/summary")
	public StatsQueries.Summary summary() {
		return queries.summary();
	}

	@GetMapping("/hourly")
	public List<StatsQueries.HourCount> hourly(@RequestParam(defaultValue = "7") @Min(1) @Max(90) int days) {
		return queries.byHourOfDay(days);
	}

	@GetMapping("/airlines")
	public List<StatsQueries.AirlineCount> airlines(
			@RequestParam(defaultValue = "7") @Min(1) @Max(90) int days,
			@RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
		return queries.topAirlines(days, limit);
	}
}

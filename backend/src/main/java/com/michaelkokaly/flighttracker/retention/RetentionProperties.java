package com.michaelkokaly.flighttracker.retention;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How long to keep flight data.
 *
 * @param fullDetail     keep every position for this long
 * @param thinInterval   after that, keep one position per aircraft per this interval
 * @param keep           delete everything older than this
 */
@ConfigurationProperties("retention")
public record RetentionProperties(Duration fullDetail, Duration thinInterval, Duration keep) {
}

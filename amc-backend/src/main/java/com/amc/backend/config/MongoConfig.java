package com.amc.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Date;

@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions customConversions() {
        return new MongoCustomConversions(Arrays.asList(
                new StringToLocalDateTimeConverter(),
                new DateToLocalDateTimeConverter()
        ));
    }

    /**
     * Handles cases where a date field was stored as an empty string in MongoDB.
     * Converts empty/blank strings to null instead of throwing a parse exception.
     */
    private static class StringToLocalDateTimeConverter implements Converter<String, LocalDateTime> {
        @Override
        public LocalDateTime convert(String source) {
            if (source == null || source.trim().isEmpty()) {
                return null;
            }
            return LocalDateTime.parse(source);
        }
    }

    /**
     * Converts BSON Date to LocalDateTime.
     */
    private static class DateToLocalDateTimeConverter implements Converter<Date, LocalDateTime> {
        @Override
        public LocalDateTime convert(Date source) {
            if (source == null) {
                return null;
            }
            return source.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
        }
    }
}

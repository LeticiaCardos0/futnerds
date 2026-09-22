package br.com.futnerds.futdb.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "futdatabase")
public record FutdatabaseProperties(String baseUrl, String apiKey) {
}

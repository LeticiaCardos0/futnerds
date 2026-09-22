package br.com.futnerds.futdb.client;

public class FutdatabaseRateLimitException extends RuntimeException {

    public FutdatabaseRateLimitException(String message) {
        super(message);
    }
}

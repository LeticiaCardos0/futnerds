package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.client.FutdatabaseClient;
import br.com.futnerds.futdb.client.FutdatabaseRateLimitException;
import br.com.futnerds.futdb.client.dto.LigaApiDto;
import br.com.futnerds.futdb.client.dto.NacoesResponseDto;
import br.com.futnerds.futdb.client.dto.PlayersResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/teste")
public class TesteApiController {

    private final FutdatabaseClient futdatabaseClient;

    public TesteApiController(FutdatabaseClient futdatabaseClient) {
        this.futdatabaseClient = futdatabaseClient;
    }

    @GetMapping("/nacoes")
    public NacoesResponseDto nacoes() {
        return futdatabaseClient.buscarNacoes(1);
    }

    @GetMapping("/jogadores")
    public PlayersResponseDto jogadores() {
        return futdatabaseClient.buscarJogadores(1);
    }

    @GetMapping("/liga/{id}")
    public LigaApiDto testarLiga(@PathVariable Long id) {
        return futdatabaseClient.buscarLigaPorId(id);
    }

    @ExceptionHandler(FutdatabaseRateLimitException.class)
    public ResponseEntity<Map<String, String>> tratarRateLimit(FutdatabaseRateLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("erro", ex.getMessage()));
    }
}

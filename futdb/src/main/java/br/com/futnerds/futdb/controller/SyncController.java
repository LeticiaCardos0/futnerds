package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.client.FutdatabaseRateLimitException;
import br.com.futnerds.futdb.service.JogadorSyncService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final JogadorSyncService jogadorSyncService;

    public SyncController(JogadorSyncService jogadorSyncService) {
        this.jogadorSyncService = jogadorSyncService;
    }

    @PostMapping("/tudo")
    public Map<String, String> tudo() {
        jogadorSyncService.sincronizarTudo();
        return Map.of("mensagem", "Sincronizacao concluida");
    }

    @ExceptionHandler(FutdatabaseRateLimitException.class)
    public ResponseEntity<Map<String, String>> tratarRateLimit(FutdatabaseRateLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("erro", ex.getMessage()));
    }
}

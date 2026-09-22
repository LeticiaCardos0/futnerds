package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.model.Jogador;
import br.com.futnerds.futdb.repository.JogadorRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@RestController
@RequestMapping("/api/imagem")
public class ImagemProxyController {

    private final JogadorRepository jogadorRepository;
    private final RestClient restClient;

    public ImagemProxyController(JogadorRepository jogadorRepository) {
        this.jogadorRepository = jogadorRepository;
        this.restClient = RestClient.create();
    }

    @GetMapping("/jogador/{jogadorId}")
    public ResponseEntity<?> buscarFotoJogador(@PathVariable Long jogadorId) {
        Jogador jogador = jogadorRepository.findById(jogadorId).orElse(null);
        if (jogador == null || jogador.getFotoUrl() == null || jogador.getFotoUrl().isBlank()) {
            return ResponseEntity.notFound().build();
        }

        ResponseEntity<byte[]> respostaCdn;
        try {
            respostaCdn = restClient.get()
                    .uri(jogador.getFotoUrl())
                    .header(HttpHeaders.REFERER, "https://sofifa.com/")
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .retrieve()
                    .toEntity(byte[].class);
        } catch (RestClientException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Erro ao buscar imagem no CDN.");
        }

        MediaType contentType = respostaCdn.getHeaders().getContentType();
        if (contentType == null) {
            contentType = MediaType.IMAGE_PNG;
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(respostaCdn.getBody());
    }
}

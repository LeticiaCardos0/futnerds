package br.com.futnerds.futdb.client;

import br.com.futnerds.futdb.client.dto.ClubesResponseDto;
import br.com.futnerds.futdb.client.dto.LigaApiDto;
import br.com.futnerds.futdb.client.dto.LigasResponseDto;
import br.com.futnerds.futdb.client.dto.NacoesResponseDto;
import br.com.futnerds.futdb.client.dto.PlayersResponseDto;
import br.com.futnerds.futdb.config.FutdatabaseProperties;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class FutdatabaseClient {

    private final RestClient restClient;

    public FutdatabaseClient(FutdatabaseProperties properties) {
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .defaultHeader("X-AUTH-TOKEN", properties.apiKey())
                .build();
    }

    public NacoesResponseDto buscarNacoes(int page) {
        return get("/nations?page={page}", page, NacoesResponseDto.class);
    }

    public LigasResponseDto buscarLigas(int page) {
        return get("/leagues?page={page}", page, LigasResponseDto.class);
    }

    public ClubesResponseDto buscarClubes(int page) {
        return get("/clubs?page={page}", page, ClubesResponseDto.class);
    }

    public PlayersResponseDto buscarJogadores(int page) {
        return get("/players?page={page}", page, PlayersResponseDto.class);
    }

    public LigaApiDto buscarLigaPorId(Long id) {
        return get("/leagues/" + id, LigaApiDto.class);
    }

    private <T> T get(String uri, int page, Class<T> responseType) {
        return restClient.get()
                .uri(uri, page)
                .retrieve()
                .onStatus(this::isTooManyRequests, (request, response) -> {
                    throw new FutdatabaseRateLimitException(
                            "Limite de requisições da Futdatabase atingido. Tente novamente mais tarde.");
                })
                .body(responseType);
    }

    private <T> T get(String uri, Class<T> responseType) {
        return restClient.get()
                .uri(uri)
                .retrieve()
                .onStatus(this::isTooManyRequests, (request, response) -> {
                    throw new FutdatabaseRateLimitException(
                            "Limite de requisições da Futdatabase atingido. Tente novamente mais tarde.");
                })
                .body(responseType);
    }

    private boolean isTooManyRequests(HttpStatusCode status) {
        return status.value() == 429;
    }
}

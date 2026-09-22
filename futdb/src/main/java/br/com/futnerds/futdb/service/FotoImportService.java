package br.com.futnerds.futdb.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Preenche jogador.foto_url a partir do CDN do sofifa.
 *
 * O CSV do FC 27 não traz mais player_face_url, mas o CDN segue o padrão
 * https://cdn.sofifa.net/players/{id/1000}/{id%1000}/{edicao}_120.png
 * (com 3 dígitos em cada parte). Testamos da edição mais nova para a mais
 * antiga e gravamos a primeira que existir, então jogadores que ainda não
 * têm foto do FC 27 ficam com a da edição anterior.
 */
@Service
public class FotoImportService {

    private static final Logger logger = LoggerFactory.getLogger(FotoImportService.class);
    private static final String URL_FOTO = "https://cdn.sofifa.net/players/%03d/%03d/%d_120.png";
    // Edições testadas, da mais nova para a mais antiga.
    private static final int[] EDICOES = {27, 26, 25, 24, 23, 22};
    private static final int REQUISICOES_SIMULTANEAS = 8;
    private static final int TAMANHO_LOTE = 500;

    private final JdbcTemplate jdbcTemplate;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public FotoImportService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long contarPendentes() {
        Long pendentes = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM jogador WHERE foto_url IS NULL", Long.class);
        return pendentes == null ? 0 : pendentes;
    }

    public String importarFotos(boolean forcar) throws InterruptedException {
        List<Long> ids = jdbcTemplate.queryForList(
                forcar ? "SELECT id FROM jogador ORDER BY overall DESC"
                       : "SELECT id FROM jogador WHERE foto_url IS NULL ORDER BY overall DESC",
                Long.class);
        int total = ids.size();
        AtomicInteger encontradas = new AtomicInteger();
        AtomicInteger naoEncontradas = new AtomicInteger();

        ExecutorService executor = Executors.newFixedThreadPool(REQUISICOES_SIMULTANEAS);
        try {
            for (int inicio = 0; inicio < total; inicio += TAMANHO_LOTE) {
                List<Long> lote = ids.subList(inicio, Math.min(inicio + TAMANHO_LOTE, total));
                List<Future<Object[]>> tarefas = new ArrayList<>();
                for (Long id : lote) {
                    tarefas.add(executor.submit(() -> {
                        String url = buscarFoto(id);
                        return url == null ? null : new Object[]{url, id};
                    }));
                }

                List<Object[]> atualizacoes = new ArrayList<>();
                for (Future<Object[]> tarefa : tarefas) {
                    try {
                        Object[] resultado = tarefa.get();
                        if (resultado != null) {
                            atualizacoes.add(resultado);
                        } else {
                            naoEncontradas.incrementAndGet();
                        }
                    } catch (java.util.concurrent.ExecutionException e) {
                        naoEncontradas.incrementAndGet();
                    }
                }
                if (!atualizacoes.isEmpty()) {
                    jdbcTemplate.batchUpdate("UPDATE jogador SET foto_url = ? WHERE id = ?", atualizacoes);
                    encontradas.addAndGet(atualizacoes.size());
                }
                logger.info("[{}/{}] fotos processadas ({} encontradas até agora).",
                        Math.min(inicio + TAMANHO_LOTE, total), total, encontradas.get());
            }
        } finally {
            executor.shutdownNow();
        }

        return encontradas.get() + " fotos encontradas, " + naoEncontradas.get() + " sem foto de " + total + " jogadores.";
    }

    @Async
    public void importarFotosAsync(boolean forcar) {
        try {
            String resultado = importarFotos(forcar);
            logger.info("Importação de fotos concluída: {}", resultado);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Importação de fotos interrompida.", e);
        } catch (Exception e) {
            logger.error("Erro na importação de fotos.", e);
        }
    }

    private String buscarFoto(Long jogadorId) throws InterruptedException {
        for (int edicao : EDICOES) {
            String url = String.format(URL_FOTO, jogadorId / 1000, jogadorId % 1000, edicao);
            if (existe(url)) {
                return url;
            }
        }
        return null;
    }

    private boolean existe(String url) throws InterruptedException {
        HttpRequest requisicao = HttpRequest.newBuilder(URI.create(url))
                .method("HEAD", HttpRequest.BodyPublishers.noBody())
                .timeout(Duration.ofSeconds(15))
                .header("Referer", "https://sofifa.com/")
                .header("User-Agent", "Mozilla/5.0")
                .build();
        for (int tentativa = 1; tentativa <= 3; tentativa++) {
            try {
                int status = httpClient.send(requisicao, HttpResponse.BodyHandlers.discarding()).statusCode();
                if (status == 429 || status >= 500) {
                    Thread.sleep(2000L * tentativa);
                    continue;
                }
                return status == 200;
            } catch (IOException e) {
                Thread.sleep(1000L * tentativa);
            }
        }
        return false;
    }
}

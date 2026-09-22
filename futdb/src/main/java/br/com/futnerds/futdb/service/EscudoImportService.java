package br.com.futnerds.futdb.service;

import br.com.futnerds.futdb.client.TheSportsDbClient;
import br.com.futnerds.futdb.dto.TheSportsDbTeamDto;
import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.repository.ClubeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EscudoImportService {

    private static final Logger logger = LoggerFactory.getLogger(EscudoImportService.class);

    private final ClubeRepository clubeRepository;
    private final TheSportsDbClient client;

    public EscudoImportService(ClubeRepository clubeRepository, TheSportsDbClient client) {
        this.clubeRepository = clubeRepository;
        this.client = client;
    }

    public String importarEscudos() throws InterruptedException {
        return importarEscudos(false, null);
    }

    public String importarEscudos(boolean forcar) throws InterruptedException {
        return importarEscudos(forcar, null);
    }

    public String importarEscudos(boolean forcar, List<Long> clubeIds) throws InterruptedException {
        List<Clube> clubes = clubeRepository.findAll().stream()
                .filter(clube -> clubeIds == null || clubeIds.isEmpty() || clubeIds.contains(clube.getId()))
                .filter(clube -> forcar
                        ? (clube.getIdTheSportsDb() == null || clube.getEstadio() == null)
                        : clube.getEscudoUrl() == null)
                .toList();
        int total = clubes.size();
        int encontrados = 0;
        int naoEncontrados = 0;
        int processado = 0;

        for (Clube clube : clubes) {
            processado++;
            logger.info("[{}/{}] Buscando detalhes de '{}'...", processado, total, clube.getNome());
            if (processarClube(clube)) {
                encontrados++;
                logger.info("[{}/{}] '{}' -> detalhes salvos.", processado, total, clube.getNome());
            } else {
                naoEncontrados++;
                logger.info("[{}/{}] '{}' -> não encontrado.", processado, total, clube.getNome());
            }
        }

        return encontrados + " escudos encontrados, " + naoEncontrados + " não encontrados de " + total + " times.";
    }

    @Async
    public void importarEscudosAsync(boolean forcar) {
        try {
            String resultado = importarEscudos(forcar, null);
            logger.info("Importação de detalhes em lote concluída: {}", resultado);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Importação de detalhes em lote interrompida.", e);
        } catch (Exception e) {
            logger.error("Erro na importação de detalhes em lote.", e);
        }
    }

    private boolean processarClube(Clube clube) throws InterruptedException {
        TheSportsDbTeamDto resultado = client.buscarEscudoPorNome(clube.getNome());
        if (resultado != null && resultado.getStrBadge() != null) {
            clube.setEscudoUrl(resultado.getStrBadge());
            clube.setIdTheSportsDb(resultado.getIdTeam());
            clube.setEstadio(resultado.getStrStadium());
            clube.setCidade(resultado.getStrStadiumLocation());
            clube.setCapacidadeEstadio(parseInteiro(resultado.getIntStadiumCapacity()));
            clube.setFundacao(parseInteiro(resultado.getIntFormedYear()));
            clubeRepository.save(clube);
            return true;
        }
        return false;
    }

    private Integer parseInteiro(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(valor.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

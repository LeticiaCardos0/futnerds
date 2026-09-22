package br.com.futnerds.futdb.service;

import br.com.futnerds.futdb.client.BuscaEquipamentoResultado;
import br.com.futnerds.futdb.client.TheSportsDbClient;
import br.com.futnerds.futdb.dto.TheSportsDbEquipmentDto;
import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.model.Uniforme;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.UniformeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UniformeImportService {

    private static final Logger logger = LoggerFactory.getLogger(UniformeImportService.class);

    private final ClubeRepository clubeRepository;
    private final UniformeRepository uniformeRepository;
    private final TheSportsDbClient client;

    public UniformeImportService(ClubeRepository clubeRepository, UniformeRepository uniformeRepository, TheSportsDbClient client) {
        this.clubeRepository = clubeRepository;
        this.uniformeRepository = uniformeRepository;
        this.client = client;
    }

    public String importarUniformes() throws InterruptedException {
        return importarUniformes(false, null);
    }

    public String importarUniformes(boolean forcar) throws InterruptedException {
        return importarUniformes(forcar, null);
    }

    public String importarUniformes(boolean forcar, List<Long> clubeIds) throws InterruptedException {
        List<Clube> clubes = clubeRepository.findAll().stream()
                .filter(clube -> clubeIds == null || clubeIds.isEmpty() || clubeIds.contains(clube.getId()))
                .filter(clube -> clube.getIdTheSportsDb() != null)
                .filter(clube -> forcar || !uniformeRepository.existsByClube_Id(clube.getId()))
                .toList();
        int total = clubes.size();
        int encontrados = 0;
        int naoEncontrados = 0;
        int processado = 0;

        for (Clube clube : clubes) {
            processado++;
            logger.info("[{}/{}] Buscando uniformes de '{}' (idTheSportsDb={})...", processado, total, clube.getNome(), clube.getIdTheSportsDb());
            BuscaEquipamentoResultado resultado = processarClube(clube, forcar);

            if (resultado.motivoFalha() == BuscaEquipamentoResultado.MotivoFalha.RATE_LIMIT) {
                logger.error("[{}/{}] Rate limit (429) da TheSportsDB atingido em '{}' - interrompendo o lote.", processado, total, clube.getNome());
                int processadosAntes = encontrados + naoEncontrados;
                return encontrados + " times com uniformes importados, " + naoEncontrados + " sem uniformes encontrados de "
                        + processadosAntes + " times processados; LOTE INTERROMPIDO por rate limit (429) da TheSportsDB - "
                        + (total - processadosAntes) + " de " + total + " times não foram tentados.";
            } else if (resultado.sucesso()) {
                encontrados++;
                logger.info("[{}/{}] '{}' -> uniformes salvos.", processado, total, clube.getNome());
            } else {
                naoEncontrados++;
                logger.info("[{}/{}] '{}' -> nenhum uniforme encontrado ({}).", processado, total, clube.getNome(), resultado.motivoFalha());
            }
        }

        return encontrados + " times com uniformes importados, " + naoEncontrados + " sem uniformes encontrados de " + total + " times.";
    }

    @Async
    public void importarUniformesAsync(boolean forcar) {
        try {
            String resultado = importarUniformes(forcar, null);
            logger.info("Importação de uniformes em lote concluída: {}", resultado);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Importação de uniformes em lote interrompida.", e);
        } catch (Exception e) {
            logger.error("Erro na importação de uniformes em lote.", e);
        }
    }

    private BuscaEquipamentoResultado processarClube(Clube clube, boolean forcar) throws InterruptedException {
        BuscaEquipamentoResultado resultado = client.buscarEquipamentos(clube.getIdTheSportsDb(), clube.getId(), clube.getNome());
        if (!resultado.sucesso()) {
            return resultado;
        }

        Map<String, TheSportsDbEquipmentDto> maisRecentePorTipo = new HashMap<>();
        for (TheSportsDbEquipmentDto equipamento : resultado.equipamentos()) {
            String tipo = mapearTipo(equipamento.getStrType());
            if (tipo == null || equipamento.getStrEquipment() == null) {
                continue;
            }
            TheSportsDbEquipmentDto atual = maisRecentePorTipo.get(tipo);
            if (atual == null || ehMaisRecente(equipamento.getStrSeason(), atual.getStrSeason())) {
                maisRecentePorTipo.put(tipo, equipamento);
            }
        }

        if (maisRecentePorTipo.isEmpty()) {
            return BuscaEquipamentoResultado.semDados();
        }

        if (forcar) {
            uniformeRepository.deleteAll(uniformeRepository.findByClube_Id(clube.getId()));
        }

        for (Map.Entry<String, TheSportsDbEquipmentDto> entrada : maisRecentePorTipo.entrySet()) {
            Uniforme uniforme = new Uniforme();
            uniforme.setClube(clube);
            uniforme.setTipo(entrada.getKey());
            uniforme.setImagemUrl(entrada.getValue().getStrEquipment());
            uniforme.setTemporada(entrada.getValue().getStrSeason());
            uniformeRepository.save(uniforme);
        }
        return resultado;
    }

    private String mapearTipo(String strType) {
        if (strType == null) {
            return null;
        }
        return switch (strType.trim()) {
            case "1st" -> "Home";
            case "2nd" -> "Away";
            case "3rd" -> "Third";
            default -> null;
        };
    }

    private boolean ehMaisRecente(String candidata, String atual) {
        if (candidata == null) {
            return false;
        }
        if (atual == null) {
            return true;
        }
        return candidata.compareTo(atual) > 0;
    }
}

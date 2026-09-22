package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.dto.LigaResumoDto;
import br.com.futnerds.futdb.dto.PaisResumoDto;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.JogadorRepository;
import br.com.futnerds.futdb.repository.LigaRepository;
import br.com.futnerds.futdb.repository.NacaoRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nacoes")
public class NacaoController {

    private final NacaoRepository nacaoRepository;
    private final LigaRepository ligaRepository;
    private final ClubeRepository clubeRepository;
    private final JogadorRepository jogadorRepository;

    public NacaoController(NacaoRepository nacaoRepository, LigaRepository ligaRepository,
                           ClubeRepository clubeRepository, JogadorRepository jogadorRepository) {
        this.nacaoRepository = nacaoRepository;
        this.ligaRepository = ligaRepository;
        this.clubeRepository = clubeRepository;
        this.jogadorRepository = jogadorRepository;
    }

    /**
     * Resumo de cada país para o globo da tela "Nações": ligas com clubes,
     * total de clubes e total de jogadores nascidos ali. Países sem liga
     * nenhuma continuam na lista quando têm jogadores (o globo mostra o
     * painel com "nenhuma liga cadastrada", mas com a contagem de jogadores).
     */
    @GetMapping("/resumo")
    public List<PaisResumoDto> resumo() {
        Map<Long, Long> jogadoresPorNacao = contarJogadoresPorNacao();

        return nacaoRepository.findAll().stream()
            .map(nacao -> {
                List<LigaResumoDto> ligas = ligaRepository.findByNacao_Id(nacao.getId()).stream()
                    .map(liga -> new LigaResumoDto(liga.getNome(), clubeRepository.countByLiga_Id(liga.getId())))
                    .filter(l -> l.getQuantidadeClubes() > 0)
                    .toList();
                long jogadores = jogadoresPorNacao.getOrDefault(nacao.getId(), 0L);
                return new PaisResumoDto(nacao.getNome(), ligas, jogadores);
            })
            .filter(p -> p.getQuantidadeLigas() > 0 || p.getQuantidadeJogadores() > 0)
            .toList();
    }

    /** Uma consulta agrupada em vez de um count por nação. */
    private Map<Long, Long> contarJogadoresPorNacao() {
        Map<Long, Long> porNacao = new HashMap<>();
        for (Object[] linha : jogadorRepository.contarPorNacao()) {
            porNacao.put(((Number) linha[0]).longValue(), ((Number) linha[1]).longValue());
        }
        return porNacao;
    }
}

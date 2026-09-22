package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.dto.ConversorPaisCodigo;
import br.com.futnerds.futdb.dto.LigaSaidaDto;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.LigaRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ligas")
public class LigaController {

    private final LigaRepository ligaRepository;
    private final ClubeRepository clubeRepository;

    public LigaController(LigaRepository ligaRepository, ClubeRepository clubeRepository) {
        this.ligaRepository = ligaRepository;
        this.clubeRepository = clubeRepository;
    }

    @GetMapping
    public List<LigaSaidaDto> listar() {
        return ligaRepository.findAll().stream()
            .map(liga -> {
                long qtdClubes = clubeRepository.countByLiga_Id(liga.getId());
                String paisNome = liga.getNacao() != null ? liga.getNacao().getNome() : null;
                String paisCodigo = paisNome != null ? ConversorPaisCodigo.obterCodigo(paisNome) : "un";
                return new LigaSaidaDto(liga.getId(), liga.getNome(), paisNome, paisCodigo, qtdClubes);
            })
            .filter(l -> l.getPaisNome() != null)
            .sorted((a, b) -> Long.compare(b.getQuantidadeClubes(), a.getQuantidadeClubes()))
            .toList();
    }
}

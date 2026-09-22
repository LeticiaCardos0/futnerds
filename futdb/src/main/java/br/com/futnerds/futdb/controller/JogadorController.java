package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.dto.JogadorHistoricoDto;
import br.com.futnerds.futdb.dto.JogadorSaidaDto;
import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.model.Jogador;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.JogadorHistoricoRepository;
import br.com.futnerds.futdb.repository.JogadorRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/jogadores")
public class JogadorController {

    private final JogadorRepository jogadorRepository;
    private final JogadorHistoricoRepository jogadorHistoricoRepository;
    private final ClubeRepository clubeRepository;

    public JogadorController(JogadorRepository jogadorRepository, JogadorHistoricoRepository jogadorHistoricoRepository, ClubeRepository clubeRepository) {
        this.jogadorRepository = jogadorRepository;
        this.jogadorHistoricoRepository = jogadorHistoricoRepository;
        this.clubeRepository = clubeRepository;
    }

    @GetMapping
    public Map<String, Object> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String posicao) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Jogador> resultado;

        if (nome != null && !nome.isBlank()) {
            resultado = jogadorRepository.buscarPorNomeComumSemAcento(nome, pageable);
        } else if (posicao != null && !posicao.isBlank() && !posicao.equalsIgnoreCase("Todas")) {
            resultado = jogadorRepository.findByPosicaoOrderByOverallDesc(posicao, pageable);
        } else {
            resultado = jogadorRepository.findAllByOrderByOverallDesc(pageable);
        }

        List<JogadorSaidaDto> dtos = resultado.getContent().stream().map(JogadorSaidaDto::new).toList();

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("jogadores", dtos);
        resposta.put("paginaAtual", resultado.getNumber());
        resposta.put("totalPaginas", resultado.getTotalPages());
        resposta.put("totalItens", resultado.getTotalElements());
        return resposta;
    }

    @GetMapping("/{id}")
    public JogadorSaidaDto buscarPorId(@PathVariable Long id) {
        Jogador jogador = jogadorRepository.findById(id).orElseThrow();
        List<JogadorHistoricoDto> historico = jogadorHistoricoRepository
                .findByJogadorIdOrderByEdicaoAsc(id)
                .stream()
                .map(JogadorHistoricoDto::new)
                .toList();

        // pra cada linha do histórico, tenta achar o escudo do clube pelo
        // nome (a tabela jogador_historico só guarda o nome em texto, não
        // uma referência direta pro clube). Tenta o nome exato primeiro, e
        // se não achar, tenta variações com/sem hífen — é comum um dataset
        // escrever "Paris Saint Germain" e o outro "Paris Saint-Germain".
        historico.forEach(h -> buscarEscudoTolerante(h.getClube())
                .ifPresent(h::setEscudoUrl));

        return new JogadorSaidaDto(jogador, historico);
    }

    private java.util.Optional<String> buscarEscudoTolerante(String nomeClube) {
        if (nomeClube == null || nomeClube.isBlank()) return java.util.Optional.empty();

        java.util.Optional<Clube> encontrado = clubeRepository.findFirstByNomeIgnoreCase(nomeClube);
        if (encontrado.isEmpty()) {
            // tenta trocando espaço por hífen (ex.: "Paris Saint Germain" -> "Paris Saint-Germain")
            encontrado = clubeRepository.findFirstByNomeIgnoreCase(nomeClube.replace(" ", "-"));
        }
        if (encontrado.isEmpty()) {
            // tenta o caminho inverso, trocando hífen por espaço
            encontrado = clubeRepository.findFirstByNomeIgnoreCase(nomeClube.replace("-", " "));
        }
        return encontrado.map(Clube::getEscudoUrl);
    }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public void tratarNaoEncontrado() {
    }
}

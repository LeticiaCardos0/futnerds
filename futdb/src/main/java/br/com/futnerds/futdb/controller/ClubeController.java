package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.dto.ClubeDetalhesSaidaDto;
import br.com.futnerds.futdb.dto.ClubeSaidaDto;
import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.model.Jogador;
import br.com.futnerds.futdb.model.Uniforme;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.JogadorRepository;
import br.com.futnerds.futdb.repository.UniformeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.RequestParam;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/times")
public class ClubeController {

    private final ClubeRepository clubeRepository;
    private final JogadorRepository jogadorRepository;
    private final UniformeRepository uniformeRepository;

    public ClubeController(ClubeRepository clubeRepository, JogadorRepository jogadorRepository, UniformeRepository uniformeRepository) {
        this.clubeRepository = clubeRepository;
        this.jogadorRepository = jogadorRepository;
        this.uniformeRepository = uniformeRepository;
    }

    @GetMapping
    public Map<String, Object> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String liga,
            @RequestParam(required = false) String pais) {

        int offset = page * size;
        List<Object[]> linhas = clubeRepository.buscarTimesPaginado(nome, liga, pais, size, offset);
        long totalItens = clubeRepository.contarTimes(nome, liga, pais);
        int totalPaginas = (int) Math.ceil((double) totalItens / size);

        List<ClubeSaidaDto> times = linhas.stream()
            .map(row -> new ClubeSaidaDto(
                ((Number) row[0]).longValue(),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                row[4] != null ? ((Number) row[4]).doubleValue() : null,
                row[5] != null ? ((Number) row[5]).longValue() : 0L,
                row[6] != null ? ((Number) row[6]).longValue() : 0L,
                row[7] != null ? ((Number) row[7]).doubleValue() : null
            ))
            .toList();

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("times", times);
        resposta.put("paginaAtual", page);
        resposta.put("totalPaginas", totalPaginas);
        resposta.put("totalItens", totalItens);
        return resposta;
    }

    @GetMapping("/{id}")
    public ClubeDetalhesSaidaDto buscarPorId(@PathVariable Long id) {
        Clube clube = clubeRepository.findById(id).orElseThrow();
        List<Jogador> elenco = jogadorRepository.findByClube_Id(id);
        List<Uniforme> uniformes = uniformeRepository.findByClube_Id(id);
        return new ClubeDetalhesSaidaDto(clube, elenco, uniformes);
    }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public void tratarNaoEncontrado() {
    }
}

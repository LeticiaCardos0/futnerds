package br.com.futnerds.futdb.service;

import br.com.futnerds.futdb.client.FutdatabaseClient;
import br.com.futnerds.futdb.client.dto.ClubeApiDto;
import br.com.futnerds.futdb.client.dto.LigaApiDto;
import br.com.futnerds.futdb.client.dto.NacaoApiDto;
import br.com.futnerds.futdb.client.dto.PlayerApiDto;
import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.model.Jogador;
import br.com.futnerds.futdb.model.Liga;
import br.com.futnerds.futdb.model.Nacao;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.JogadorRepository;
import br.com.futnerds.futdb.repository.LigaRepository;
import br.com.futnerds.futdb.repository.NacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class JogadorSyncService {

    private final FutdatabaseClient futdatabaseClient;
    private final NacaoRepository nacaoRepository;
    private final LigaRepository ligaRepository;
    private final ClubeRepository clubeRepository;
    private final JogadorRepository jogadorRepository;

    public JogadorSyncService(FutdatabaseClient futdatabaseClient,
                               NacaoRepository nacaoRepository,
                               LigaRepository ligaRepository,
                               ClubeRepository clubeRepository,
                               JogadorRepository jogadorRepository) {
        this.futdatabaseClient = futdatabaseClient;
        this.nacaoRepository = nacaoRepository;
        this.ligaRepository = ligaRepository;
        this.clubeRepository = clubeRepository;
        this.jogadorRepository = jogadorRepository;
    }

    @Transactional
    public void sincronizarTudo() {
        sincronizarNacoes();
        sincronizarLigas();
        sincronizarClubes();
        sincronizarJogadores();
    }

    private void sincronizarNacoes() {
        List<NacaoApiDto> items = futdatabaseClient.buscarNacoes(1).getItems();
        for (NacaoApiDto item : items) {
            Nacao nacao = nacaoRepository.findById(item.getId()).orElseGet(Nacao::new);
            nacao.setId(item.getId());
            nacao.setNome(item.getName());
            nacaoRepository.save(nacao);
        }
    }

    private void sincronizarLigas() {
        List<LigaApiDto> items = futdatabaseClient.buscarLigas(1).getItems();
        for (LigaApiDto item : items) {
            Liga liga = ligaRepository.findById(item.getId()).orElseGet(Liga::new);
            liga.setId(item.getId());
            liga.setNome(item.getName());
            liga.setNacao(nacaoRepository.findById(item.getNationId()).orElse(null));
            ligaRepository.save(liga);
        }
    }

    private void sincronizarClubes() {
        List<ClubeApiDto> items = futdatabaseClient.buscarClubes(1).getItems();
        for (ClubeApiDto item : items) {
            Clube clube = clubeRepository.findById(item.getId()).orElseGet(Clube::new);
            clube.setId(item.getId());
            clube.setNome(item.getName());
            clube.setLiga(ligaRepository.findById(item.getLeague()).orElse(null));
            clube.setClubePaiId(item.getParent_club());
            clubeRepository.save(clube);
        }
    }

    private void sincronizarJogadores() {
        List<PlayerApiDto> items = futdatabaseClient.buscarJogadores(1).getItems();
        for (PlayerApiDto item : items) {
            Jogador jogador = jogadorRepository.findById(item.getId()).orElseGet(Jogador::new);
            jogador.setId(item.getId());
            jogador.setNome(item.getName());
            jogador.setNomeComum(item.getCommonName());
            jogador.setIdade(toShort(item.getAge()));
            jogador.setAltura(toShort(item.getHeight()));
            jogador.setPeso(toShort(item.getWeight()));
            jogador.setPeDominante(item.getFoot());
            jogador.setPosicao(item.getPosition());
            jogador.setPosicoesAlternativas(juntarPosicoes(item.getPositionAlternatives()));
            jogador.setOverall(toShort(item.getRating()));
            jogador.setRaridadeId(item.getRarity());
            jogador.setNacao(nacaoRepository.findById(item.getNation()).orElse(null));
            jogador.setClube(clubeRepository.findById(item.getClub()).orElse(null));
            jogador.setLiga(ligaRepository.findById(item.getLeague()).orElse(null));
            jogador.setAtualizadoEm(LocalDateTime.now());
            jogadorRepository.save(jogador);
        }
    }

    private Short toShort(Integer valor) {
        return valor == null ? null : valor.shortValue();
    }

    private String juntarPosicoes(List<String> posicoes) {
        if (posicoes == null || posicoes.isEmpty()) {
            return null;
        }
        return String.join(",", posicoes);
    }
}

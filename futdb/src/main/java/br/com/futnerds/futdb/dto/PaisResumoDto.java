package br.com.futnerds.futdb.dto;

import java.util.List;

public class PaisResumoDto {
    private String nome;
    private long quantidadeLigas;
    private long quantidadeClubes;
    private long quantidadeJogadores;
    private List<LigaResumoDto> ligas;

    public PaisResumoDto(String nome, List<LigaResumoDto> ligas, long quantidadeJogadores) {
        this.nome = nome;
        this.ligas = ligas;
        this.quantidadeLigas = ligas.size();
        this.quantidadeClubes = ligas.stream().mapToLong(LigaResumoDto::getQuantidadeClubes).sum();
        this.quantidadeJogadores = quantidadeJogadores;
    }

    public String getNome() {
        return nome;
    }

    public long getQuantidadeLigas() {
        return quantidadeLigas;
    }

    public long getQuantidadeClubes() {
        return quantidadeClubes;
    }

    public long getQuantidadeJogadores() {
        return quantidadeJogadores;
    }

    public List<LigaResumoDto> getLigas() {
        return ligas;
    }
}

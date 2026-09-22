package br.com.futnerds.futdb.dto;

import br.com.futnerds.futdb.model.Jogador;

public class JogadorTimeSaidaDto {

    private Long id;
    private String nome;
    private String foto;
    private Short overall;
    private String posicao;
    private Integer numeroCamisa;
    private boolean titular;

    public JogadorTimeSaidaDto(Jogador jogador, boolean titular) {
        this.id = jogador.getId();
        this.nome = jogador.getNomeComum();
        this.foto = jogador.getFotoUrl();
        this.overall = jogador.getOverall();
        this.posicao = jogador.getPosicao();
        this.numeroCamisa = null;
        this.titular = titular;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getFoto() {
        return foto;
    }

    public Short getOverall() {
        return overall;
    }

    public String getPosicao() {
        return posicao;
    }

    public Integer getNumeroCamisa() {
        return numeroCamisa;
    }

    public boolean isTitular() {
        return titular;
    }
}

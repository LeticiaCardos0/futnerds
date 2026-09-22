package br.com.futnerds.futdb.dto;

public class ClubeSaidaDto {
    private Long id;
    private String nome;
    private String escudoUrl;
    private String ligaNome;
    private Double overallMedio;
    private Long quantidadeJogadores;
    private Long valorElenco;
    private Double idadeMedia;

    public ClubeSaidaDto(Long id, String nome, String escudoUrl, String ligaNome,
                          Double overallMedio, Long quantidadeJogadores, Long valorElenco, Double idadeMedia) {
        this.id = id;
        this.nome = nome;
        this.escudoUrl = escudoUrl;
        this.ligaNome = ligaNome;
        this.overallMedio = overallMedio;
        this.quantidadeJogadores = quantidadeJogadores;
        this.valorElenco = valorElenco;
        this.idadeMedia = idadeMedia;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEscudoUrl() {
        return escudoUrl;
    }

    public String getLigaNome() {
        return ligaNome;
    }

    public Double getOverallMedio() {
        return overallMedio;
    }

    public Long getQuantidadeJogadores() {
        return quantidadeJogadores;
    }

    public Long getValorElenco() {
        return valorElenco;
    }

    public Double getIdadeMedia() {
        return idadeMedia;
    }
}

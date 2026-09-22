package br.com.futnerds.futdb.dto;

import br.com.futnerds.futdb.model.JogadorHistorico;

public class JogadorHistoricoDto {

    private Short edicao;
    private Short overall;
    private Short potencial;
    private String clube;
    private String liga;
    private String escudoUrl;

    public JogadorHistoricoDto(JogadorHistorico historico) {
        this.edicao = historico.getEdicao();
        this.overall = historico.getOverall();
        this.potencial = historico.getPotencial();
        this.clube = historico.getClube();
        this.liga = historico.getLiga();
    }

    /** Usado quando conseguimos encontrar o escudo do clube na tabela
     *  clube (busca por nome, feita no controller). */
    public void setEscudoUrl(String escudoUrl) {
        this.escudoUrl = escudoUrl;
    }

    public String getEscudoUrl() {
        return escudoUrl;
    }

    public Short getEdicao() {
        return edicao;
    }

    public Short getOverall() {
        return overall;
    }

    public Short getPotencial() {
        return potencial;
    }

    public String getClube() {
        return clube;
    }

    public String getLiga() {
        return liga;
    }
}

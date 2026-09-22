package br.com.futnerds.futdb.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "jogador_historico", uniqueConstraints = @UniqueConstraint(columnNames = {"jogador_id", "edicao"}))
public class JogadorHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long jogadorId;
    private Short edicao;
    private Short overall;
    private Short potencial;
    private String clube;
    private String liga;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getJogadorId() {
        return jogadorId;
    }

    public void setJogadorId(Long jogadorId) {
        this.jogadorId = jogadorId;
    }

    public Short getEdicao() {
        return edicao;
    }

    public void setEdicao(Short edicao) {
        this.edicao = edicao;
    }

    public Short getOverall() {
        return overall;
    }

    public void setOverall(Short overall) {
        this.overall = overall;
    }

    public Short getPotencial() {
        return potencial;
    }

    public void setPotencial(Short potencial) {
        this.potencial = potencial;
    }

    public String getClube() {
        return clube;
    }

    public void setClube(String clube) {
        this.clube = clube;
    }

    public String getLiga() {
        return liga;
    }

    public void setLiga(String liga) {
        this.liga = liga;
    }
}

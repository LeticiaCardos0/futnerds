package br.com.futnerds.futdb.model;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "clube")
public class Clube {

    @Id
    private Long id;

    private String nome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "liga_id")
    private Liga liga;

    private Long clubePaiId;
    private String escudoUrl;
    private String estadio;
    private String cidade;
    private Integer capacidadeEstadio;
    private Integer fundacao;
    private String idTheSportsDb;

    public Clube() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Liga getLiga() {
        return liga;
    }

    public void setLiga(Liga liga) {
        this.liga = liga;
    }

    public Long getClubePaiId() {
        return clubePaiId;
    }

    public void setClubePaiId(Long clubePaiId) {
        this.clubePaiId = clubePaiId;
    }

    public String getEscudoUrl() {
        return escudoUrl;
    }

    public void setEscudoUrl(String escudoUrl) {
        this.escudoUrl = escudoUrl;
    }

    public String getEstadio() {
        return estadio;
    }

    public void setEstadio(String estadio) {
        this.estadio = estadio;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public Integer getCapacidadeEstadio() {
        return capacidadeEstadio;
    }

    public void setCapacidadeEstadio(Integer capacidadeEstadio) {
        this.capacidadeEstadio = capacidadeEstadio;
    }

    public Integer getFundacao() {
        return fundacao;
    }

    public void setFundacao(Integer fundacao) {
        this.fundacao = fundacao;
    }

    public String getIdTheSportsDb() {
        return idTheSportsDb;
    }

    public void setIdTheSportsDb(String idTheSportsDb) {
        this.idTheSportsDb = idTheSportsDb;
    }
}
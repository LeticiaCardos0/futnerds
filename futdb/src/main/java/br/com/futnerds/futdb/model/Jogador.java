package br.com.futnerds.futdb.model;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "jogador")
public class Jogador {

    @Id
    private Long id;

    private String nome;
    private String nomeComum;
    private Short idade;
    private Short altura;
    private Short peso;
    private String peDominante;
    private String posicao;
    private String posicoesAlternativas;
    private Short overall;
    private Short potencial;
    private Long raridadeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nacao_id")
    private Nacao nacao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clube_id")
    private Clube clube;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "liga_id")
    private Liga liga;

    private String fotoUrl;
    private Long precoPc;
    private Long precoConsole;
    private Long salario;
    private Short velocidade;
    private Short finalizacao;
    private Short passe;
    private Short drible;
    private String traits;
    private Short cruzamento;
    private Short finalizacaoDetalhada;
    private Short cabeceio;
    private Short passeCurto;
    private Short voleio;
    private Short dribleDetalhado;
    private Short curva;
    private Short precisaoFalta;
    private Short passeLongo;
    private Short controleDeBola;
    private Short aceleracao;
    private Short velocidadeSprint;
    private Short agilidade;
    private Short reacoes;
    private Short equilibrio;
    private Short potenciaChute;
    private Short impulsao;
    private Short folego;
    private Short forca;
    private Short chutesDeLonge;
    private Short agressao;
    private Short interceptacao;
    private Short posicionamento;
    private Short visao;
    private Short penaltis;
    private Short compostura;
    private Short marcacao;
    private Short desarmeEmPe;
    private Short desarmeDeslizante;
    private Short goleiroElasticidade;
    private Short goleiroAgarrar;
    private Short goleiroChute;
    private Short goleiroPosicionamento;
    private Short goleiroReflexos;
    private LocalDateTime atualizadoEm;

    public Jogador() {
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

    public String getNomeComum() {
        return nomeComum;
    }

    public void setNomeComum(String nomeComum) {
        this.nomeComum = nomeComum;
    }

    public Short getIdade() {
        return idade;
    }

    public void setIdade(Short idade) {
        this.idade = idade;
    }

    public Short getAltura() {
        return altura;
    }

    public void setAltura(Short altura) {
        this.altura = altura;
    }

    public Short getPeso() {
        return peso;
    }

    public void setPeso(Short peso) {
        this.peso = peso;
    }

    public String getPeDominante() {
        return peDominante;
    }

    public void setPeDominante(String peDominante) {
        this.peDominante = peDominante;
    }

    public String getPosicao() {
        return posicao;
    }

    public void setPosicao(String posicao) {
        this.posicao = posicao;
    }

    public String getPosicoesAlternativas() {
        return posicoesAlternativas;
    }

    public void setPosicoesAlternativas(String posicoesAlternativas) {
        this.posicoesAlternativas = posicoesAlternativas;
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

    public Long getRaridadeId() {
        return raridadeId;
    }

    public void setRaridadeId(Long raridadeId) {
        this.raridadeId = raridadeId;
    }

    public Nacao getNacao() {
        return nacao;
    }

    public void setNacao(Nacao nacao) {
        this.nacao = nacao;
    }

    public Clube getClube() {
        return clube;
    }

    public void setClube(Clube clube) {
        this.clube = clube;
    }

    public Liga getLiga() {
        return liga;
    }

    public void setLiga(Liga liga) {
        this.liga = liga;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public Long getPrecoPc() {
        return precoPc;
    }

    public void setPrecoPc(Long precoPc) {
        this.precoPc = precoPc;
    }

    public Long getPrecoConsole() {
        return precoConsole;
    }

    public void setPrecoConsole(Long precoConsole) {
        this.precoConsole = precoConsole;
    }

    public Long getSalario() {
        return salario;
    }

    public void setSalario(Long salario) {
        this.salario = salario;
    }

    public Short getVelocidade() {
        return velocidade;
    }

    public void setVelocidade(Short velocidade) {
        this.velocidade = velocidade;
    }

    public Short getFinalizacao() {
        return finalizacao;
    }

    public void setFinalizacao(Short finalizacao) {
        this.finalizacao = finalizacao;
    }

    public Short getPasse() {
        return passe;
    }

    public void setPasse(Short passe) {
        this.passe = passe;
    }

    public Short getDrible() {
        return drible;
    }

    public void setDrible(Short drible) {
        this.drible = drible;
    }

    public String getTraits() {
        return traits;
    }

    public void setTraits(String traits) {
        this.traits = traits;
    }

    public Short getCruzamento() {
        return cruzamento;
    }

    public void setCruzamento(Short cruzamento) {
        this.cruzamento = cruzamento;
    }

    public Short getFinalizacaoDetalhada() {
        return finalizacaoDetalhada;
    }

    public void setFinalizacaoDetalhada(Short finalizacaoDetalhada) {
        this.finalizacaoDetalhada = finalizacaoDetalhada;
    }

    public Short getCabeceio() {
        return cabeceio;
    }

    public void setCabeceio(Short cabeceio) {
        this.cabeceio = cabeceio;
    }

    public Short getPasseCurto() {
        return passeCurto;
    }

    public void setPasseCurto(Short passeCurto) {
        this.passeCurto = passeCurto;
    }

    public Short getVoleio() {
        return voleio;
    }

    public void setVoleio(Short voleio) {
        this.voleio = voleio;
    }

    public Short getDribleDetalhado() {
        return dribleDetalhado;
    }

    public void setDribleDetalhado(Short dribleDetalhado) {
        this.dribleDetalhado = dribleDetalhado;
    }

    public Short getCurva() {
        return curva;
    }

    public void setCurva(Short curva) {
        this.curva = curva;
    }

    public Short getPrecisaoFalta() {
        return precisaoFalta;
    }

    public void setPrecisaoFalta(Short precisaoFalta) {
        this.precisaoFalta = precisaoFalta;
    }

    public Short getPasseLongo() {
        return passeLongo;
    }

    public void setPasseLongo(Short passeLongo) {
        this.passeLongo = passeLongo;
    }

    public Short getControleDeBola() {
        return controleDeBola;
    }

    public void setControleDeBola(Short controleDeBola) {
        this.controleDeBola = controleDeBola;
    }

    public Short getAceleracao() {
        return aceleracao;
    }

    public void setAceleracao(Short aceleracao) {
        this.aceleracao = aceleracao;
    }

    public Short getVelocidadeSprint() {
        return velocidadeSprint;
    }

    public void setVelocidadeSprint(Short velocidadeSprint) {
        this.velocidadeSprint = velocidadeSprint;
    }

    public Short getAgilidade() {
        return agilidade;
    }

    public void setAgilidade(Short agilidade) {
        this.agilidade = agilidade;
    }

    public Short getReacoes() {
        return reacoes;
    }

    public void setReacoes(Short reacoes) {
        this.reacoes = reacoes;
    }

    public Short getEquilibrio() {
        return equilibrio;
    }

    public void setEquilibrio(Short equilibrio) {
        this.equilibrio = equilibrio;
    }

    public Short getPotenciaChute() {
        return potenciaChute;
    }

    public void setPotenciaChute(Short potenciaChute) {
        this.potenciaChute = potenciaChute;
    }

    public Short getImpulsao() {
        return impulsao;
    }

    public void setImpulsao(Short impulsao) {
        this.impulsao = impulsao;
    }

    public Short getFolego() {
        return folego;
    }

    public void setFolego(Short folego) {
        this.folego = folego;
    }

    public Short getForca() {
        return forca;
    }

    public void setForca(Short forca) {
        this.forca = forca;
    }

    public Short getChutesDeLonge() {
        return chutesDeLonge;
    }

    public void setChutesDeLonge(Short chutesDeLonge) {
        this.chutesDeLonge = chutesDeLonge;
    }

    public Short getAgressao() {
        return agressao;
    }

    public void setAgressao(Short agressao) {
        this.agressao = agressao;
    }

    public Short getInterceptacao() {
        return interceptacao;
    }

    public void setInterceptacao(Short interceptacao) {
        this.interceptacao = interceptacao;
    }

    public Short getPosicionamento() {
        return posicionamento;
    }

    public void setPosicionamento(Short posicionamento) {
        this.posicionamento = posicionamento;
    }

    public Short getVisao() {
        return visao;
    }

    public void setVisao(Short visao) {
        this.visao = visao;
    }

    public Short getPenaltis() {
        return penaltis;
    }

    public void setPenaltis(Short penaltis) {
        this.penaltis = penaltis;
    }

    public Short getCompostura() {
        return compostura;
    }

    public void setCompostura(Short compostura) {
        this.compostura = compostura;
    }

    public Short getMarcacao() {
        return marcacao;
    }

    public void setMarcacao(Short marcacao) {
        this.marcacao = marcacao;
    }

    public Short getDesarmeEmPe() {
        return desarmeEmPe;
    }

    public void setDesarmeEmPe(Short desarmeEmPe) {
        this.desarmeEmPe = desarmeEmPe;
    }

    public Short getDesarmeDeslizante() {
        return desarmeDeslizante;
    }

    public void setDesarmeDeslizante(Short desarmeDeslizante) {
        this.desarmeDeslizante = desarmeDeslizante;
    }

    public Short getGoleiroElasticidade() {
        return goleiroElasticidade;
    }

    public void setGoleiroElasticidade(Short goleiroElasticidade) {
        this.goleiroElasticidade = goleiroElasticidade;
    }

    public Short getGoleiroAgarrar() {
        return goleiroAgarrar;
    }

    public void setGoleiroAgarrar(Short goleiroAgarrar) {
        this.goleiroAgarrar = goleiroAgarrar;
    }

    public Short getGoleiroChute() {
        return goleiroChute;
    }

    public void setGoleiroChute(Short goleiroChute) {
        this.goleiroChute = goleiroChute;
    }

    public Short getGoleiroPosicionamento() {
        return goleiroPosicionamento;
    }

    public void setGoleiroPosicionamento(Short goleiroPosicionamento) {
        this.goleiroPosicionamento = goleiroPosicionamento;
    }

    public Short getGoleiroReflexos() {
        return goleiroReflexos;
    }

    public void setGoleiroReflexos(Short goleiroReflexos) {
        this.goleiroReflexos = goleiroReflexos;
    }

    public LocalDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public void setAtualizadoEm(LocalDateTime atualizadoEm) {
        this.atualizadoEm = atualizadoEm;
    }
}
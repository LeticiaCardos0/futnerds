package br.com.futnerds.futdb.dto;

import br.com.futnerds.futdb.model.Jogador;

import java.util.Collections;
import java.util.List;

public class JogadorSaidaDto {

    private Long id;
    private String nome;
    private String foto;
    private Short overall;
    private Short potencial;
    private String timeAtual;
    private String posicao;
    private String nacionalidade;
    private String paisCodigo;
    private String peDominante;
    private Long valor;
    private Short idade;
    private Long salario;
    private Short velocidade;
    private Short finalizacao;
    private Short passe;
    private Short drible;
    private String traits;
    private String posicoesAlternativas;
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

    /** Histórico de carreira (uma linha por edição do jogo). Fica vazio
     *  ([]) por padrão — só é preenchido quando o construtor de baixo é
     *  usado, no endpoint de buscar por id. Assim a listagem paginada
     *  (que não precisa desse dado) continua leve. */
    private List<JogadorHistoricoDto> historico = Collections.emptyList();

    public JogadorSaidaDto(Jogador jogador) {
        this.id = jogador.getId();
        this.nome = jogador.getNomeComum();
        this.foto = jogador.getFotoUrl();
        this.overall = jogador.getOverall();
        this.potencial = jogador.getPotencial();
        this.timeAtual = jogador.getClube() != null ? jogador.getClube().getNome() : null;
        this.posicao = jogador.getPosicao();
        this.nacionalidade = jogador.getNacao() != null ? jogador.getNacao().getNome() : null;
        this.paisCodigo = ConversorPaisCodigo.obterCodigo(this.nacionalidade);
        this.peDominante = jogador.getPeDominante();
        this.valor = jogador.getPrecoPc();
        this.idade = jogador.getIdade();
        this.salario = jogador.getSalario();
        this.velocidade = jogador.getVelocidade();
        this.finalizacao = jogador.getFinalizacao();
        this.passe = jogador.getPasse();
        this.drible = jogador.getDrible();
        this.traits = jogador.getTraits();
        this.posicoesAlternativas = jogador.getPosicoesAlternativas();
        this.cruzamento = jogador.getCruzamento();
        this.finalizacaoDetalhada = jogador.getFinalizacaoDetalhada();
        this.cabeceio = jogador.getCabeceio();
        this.passeCurto = jogador.getPasseCurto();
        this.voleio = jogador.getVoleio();
        this.dribleDetalhado = jogador.getDribleDetalhado();
        this.curva = jogador.getCurva();
        this.precisaoFalta = jogador.getPrecisaoFalta();
        this.passeLongo = jogador.getPasseLongo();
        this.controleDeBola = jogador.getControleDeBola();
        this.aceleracao = jogador.getAceleracao();
        this.velocidadeSprint = jogador.getVelocidadeSprint();
        this.agilidade = jogador.getAgilidade();
        this.reacoes = jogador.getReacoes();
        this.equilibrio = jogador.getEquilibrio();
        this.potenciaChute = jogador.getPotenciaChute();
        this.impulsao = jogador.getImpulsao();
        this.folego = jogador.getFolego();
        this.forca = jogador.getForca();
        this.chutesDeLonge = jogador.getChutesDeLonge();
        this.agressao = jogador.getAgressao();
        this.interceptacao = jogador.getInterceptacao();
        this.posicionamento = jogador.getPosicionamento();
        this.visao = jogador.getVisao();
        this.penaltis = jogador.getPenaltis();
        this.compostura = jogador.getCompostura();
        this.marcacao = jogador.getMarcacao();
        this.desarmeEmPe = jogador.getDesarmeEmPe();
        this.desarmeDeslizante = jogador.getDesarmeDeslizante();
        this.goleiroElasticidade = jogador.getGoleiroElasticidade();
        this.goleiroAgarrar = jogador.getGoleiroAgarrar();
        this.goleiroChute = jogador.getGoleiroChute();
        this.goleiroPosicionamento = jogador.getGoleiroPosicionamento();
        this.goleiroReflexos = jogador.getGoleiroReflexos();
    }

    /** Usado no endpoint de buscar por id, quando queremos incluir o
     *  histórico de carreira junto. */
    public JogadorSaidaDto(Jogador jogador, List<JogadorHistoricoDto> historico) {
        this(jogador);
        this.historico = historico != null ? historico : Collections.emptyList();
    }

    public List<JogadorHistoricoDto> getHistorico() {
        return historico;
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

    public Short getPotencial() {
        return potencial;
    }

    public String getTimeAtual() {
        return timeAtual;
    }

    public String getPosicao() {
        return posicao;
    }

    public String getNacionalidade() {
        return nacionalidade;
    }

    public String getPaisCodigo() {
        return paisCodigo;
    }

    public String getPeDominante() {
        return peDominante;
    }

    public Long getValor() {
        return valor;
    }

    public Short getIdade() {
        return idade;
    }

    public Long getSalario() {
        return salario;
    }

    public Short getVelocidade() {
        return velocidade;
    }

    public Short getFinalizacao() {
        return finalizacao;
    }

    public Short getPasse() {
        return passe;
    }

    public Short getDrible() {
        return drible;
    }

    public String getTraits() {
        return traits;
    }

    public String getPosicoesAlternativas() {
        return posicoesAlternativas;
    }

    public Short getCruzamento() {
        return cruzamento;
    }

    public Short getFinalizacaoDetalhada() {
        return finalizacaoDetalhada;
    }

    public Short getCabeceio() {
        return cabeceio;
    }

    public Short getPasseCurto() {
        return passeCurto;
    }

    public Short getVoleio() {
        return voleio;
    }

    public Short getDribleDetalhado() {
        return dribleDetalhado;
    }

    public Short getCurva() {
        return curva;
    }

    public Short getPrecisaoFalta() {
        return precisaoFalta;
    }

    public Short getPasseLongo() {
        return passeLongo;
    }

    public Short getControleDeBola() {
        return controleDeBola;
    }

    public Short getAceleracao() {
        return aceleracao;
    }

    public Short getVelocidadeSprint() {
        return velocidadeSprint;
    }

    public Short getAgilidade() {
        return agilidade;
    }

    public Short getReacoes() {
        return reacoes;
    }

    public Short getEquilibrio() {
        return equilibrio;
    }

    public Short getPotenciaChute() {
        return potenciaChute;
    }

    public Short getImpulsao() {
        return impulsao;
    }

    public Short getFolego() {
        return folego;
    }

    public Short getForca() {
        return forca;
    }

    public Short getChutesDeLonge() {
        return chutesDeLonge;
    }

    public Short getAgressao() {
        return agressao;
    }

    public Short getInterceptacao() {
        return interceptacao;
    }

    public Short getPosicionamento() {
        return posicionamento;
    }

    public Short getVisao() {
        return visao;
    }

    public Short getPenaltis() {
        return penaltis;
    }

    public Short getCompostura() {
        return compostura;
    }

    public Short getMarcacao() {
        return marcacao;
    }

    public Short getDesarmeEmPe() {
        return desarmeEmPe;
    }

    public Short getDesarmeDeslizante() {
        return desarmeDeslizante;
    }

    public Short getGoleiroElasticidade() {
        return goleiroElasticidade;
    }

    public Short getGoleiroAgarrar() {
        return goleiroAgarrar;
    }

    public Short getGoleiroChute() {
        return goleiroChute;
    }

    public Short getGoleiroPosicionamento() {
        return goleiroPosicionamento;
    }

    public Short getGoleiroReflexos() {
        return goleiroReflexos;
    }
}

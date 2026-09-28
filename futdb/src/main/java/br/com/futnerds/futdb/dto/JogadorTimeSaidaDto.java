package br.com.futnerds.futdb.dto;

import br.com.futnerds.futdb.model.Jogador;

import java.util.Objects;
import java.util.stream.Stream;

public class JogadorTimeSaidaDto {

    private Long id;
    private String nome;
    private String foto;
    private Short overall;
    private Short potencial;
    private Short idade;
    private String posicao;
    private String posicoesAlternativas;
    private String nacionalidade;
    private String paisCodigo;
    private String peDominante;
    private Long salario;
    private Long valor;
    private Integer estatisticasTotais;
    private Short penaltis;
    private Short precisaoFalta;
    private Short curva;
    private Short cruzamento;
    private Short chutesDeLonge;
    private Integer numeroCamisa;
    private boolean titular;

    public JogadorTimeSaidaDto(Jogador jogador, boolean titular) {
        this.id = jogador.getId();
        this.nome = jogador.getNomeComum();
        this.foto = jogador.getFotoUrl();
        this.overall = jogador.getOverall();
        this.potencial = jogador.getPotencial();
        this.idade = jogador.getIdade();
        this.posicao = jogador.getPosicao();
        this.posicoesAlternativas = jogador.getPosicoesAlternativas();
        this.nacionalidade = jogador.getNacao() != null ? jogador.getNacao().getNome() : null;
        this.paisCodigo = ConversorPaisCodigo.obterCodigo(this.nacionalidade);
        this.peDominante = jogador.getPeDominante();
        this.salario = jogador.getSalario();
        this.valor = jogador.getPrecoPc();
        this.estatisticasTotais = somarAtributos(jogador);
        this.penaltis = jogador.getPenaltis();
        this.precisaoFalta = jogador.getPrecisaoFalta();
        this.curva = jogador.getCurva();
        this.cruzamento = jogador.getCruzamento();
        this.chutesDeLonge = jogador.getChutesDeLonge();
        this.numeroCamisa = null;
        this.titular = titular;
    }

    // Soma dos 34 atributos detalhados (o "total stats" do sofifa). Null se o
    // jogador não tiver nenhum atributo detalhado importado.
    private static Integer somarAtributos(Jogador j) {
        int[] soma = {0};
        long presentes = Stream.of(
                j.getCruzamento(), j.getFinalizacaoDetalhada(), j.getCabeceio(), j.getPasseCurto(), j.getVoleio(),
                j.getDribleDetalhado(), j.getCurva(), j.getPrecisaoFalta(), j.getPasseLongo(), j.getControleDeBola(),
                j.getAceleracao(), j.getVelocidadeSprint(), j.getAgilidade(), j.getReacoes(), j.getEquilibrio(),
                j.getPotenciaChute(), j.getImpulsao(), j.getFolego(), j.getForca(), j.getChutesDeLonge(),
                j.getAgressao(), j.getInterceptacao(), j.getPosicionamento(), j.getVisao(), j.getPenaltis(),
                j.getCompostura(), j.getMarcacao(), j.getDesarmeEmPe(), j.getDesarmeDeslizante(),
                j.getGoleiroElasticidade(), j.getGoleiroAgarrar(), j.getGoleiroChute(),
                j.getGoleiroPosicionamento(), j.getGoleiroReflexos())
                .filter(Objects::nonNull)
                .peek(v -> soma[0] += v)
                .count();
        return presentes == 0 ? null : soma[0];
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

    public Short getIdade() {
        return idade;
    }

    public String getPosicao() {
        return posicao;
    }

    public String getPosicoesAlternativas() {
        return posicoesAlternativas;
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

    public Long getSalario() {
        return salario;
    }

    public Long getValor() {
        return valor;
    }

    public Integer getEstatisticasTotais() {
        return estatisticasTotais;
    }

    public Short getPenaltis() {
        return penaltis;
    }

    public Short getPrecisaoFalta() {
        return precisaoFalta;
    }

    public Short getCurva() {
        return curva;
    }

    public Short getCruzamento() {
        return cruzamento;
    }

    public Short getChutesDeLonge() {
        return chutesDeLonge;
    }

    public Integer getNumeroCamisa() {
        return numeroCamisa;
    }

    public boolean isTitular() {
        return titular;
    }
}

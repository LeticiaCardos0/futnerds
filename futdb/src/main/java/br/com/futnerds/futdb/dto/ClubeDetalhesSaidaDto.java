package br.com.futnerds.futdb.dto;

import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.model.Jogador;
import br.com.futnerds.futdb.model.Uniforme;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ClubeDetalhesSaidaDto {

    private static final Set<String> POSICOES_DEFESA = Set.of("GK", "CB", "LB", "RB");
    private static final Set<String> POSICOES_MEIO = Set.of("CDM", "CM", "CAM", "LM", "RM");
    private static final Set<String> POSICOES_ATAQUE = Set.of("LW", "RW", "ST");

    private static final Map<String, Integer> FORMACAO_4_3_3 = new LinkedHashMap<>();
    static {
        FORMACAO_4_3_3.put("GK", 1);
        FORMACAO_4_3_3.put("CB", 2);
        FORMACAO_4_3_3.put("LB", 1);
        FORMACAO_4_3_3.put("RB", 1);
        FORMACAO_4_3_3.put("CDM", 1);
        FORMACAO_4_3_3.put("CM", 1);
        FORMACAO_4_3_3.put("CAM", 1);
        FORMACAO_4_3_3.put("LW", 1);
        FORMACAO_4_3_3.put("RW", 1);
        FORMACAO_4_3_3.put("ST", 1);
    }

    private Long id;
    private String nome;
    private String escudoUrl;
    private String ligaNome;
    private String paisNome;
    private String cidade;
    private String estadio;
    private Integer capacidadeEstadio;
    private Integer fundacao;
    private String resumoHistorico;
    private Double overallMedio;
    private Double overallAtaque;
    private Double overallMeio;
    private Double overallDefesa;
    private Double idadeMedia;
    private Long valorElenco;
    private Long orcamento;
    private String rivalNome;
    private Integer prestigioInternacional;
    private Integer prestigioLocal;
    private String melhorJogadorNome;
    private Short melhorJogadorOverall;
    private List<UniformeSaidaDto> uniformes;
    private List<JogadorTimeSaidaDto> elenco;
    private List<String> titulos;

    public ClubeDetalhesSaidaDto(Clube clube, List<Jogador> elenco, List<Uniforme> uniformes) {
        this.id = clube.getId();
        this.nome = clube.getNome();
        this.escudoUrl = clube.getEscudoUrl();
        this.ligaNome = clube.getLiga() != null ? clube.getLiga().getNome() : null;
        this.paisNome = clube.getLiga() != null && clube.getLiga().getNacao() != null
                ? clube.getLiga().getNacao().getNome() : null;
        this.cidade = clube.getCidade();
        this.estadio = clube.getEstadio();
        this.capacidadeEstadio = clube.getCapacidadeEstadio();
        this.fundacao = clube.getFundacao();
        this.resumoHistorico = null;
        this.orcamento = null;
        this.rivalNome = null;
        this.prestigioInternacional = null;
        this.prestigioLocal = null;
        this.titulos = new ArrayList<>();
        this.uniformes = uniformes.stream().map(UniformeSaidaDto::new).toList();

        this.overallMedio = media(elenco.stream().map(Jogador::getOverall));
        this.overallAtaque = media(elenco.stream().filter(j -> POSICOES_ATAQUE.contains(j.getPosicao())).map(Jogador::getOverall));
        this.overallMeio = media(elenco.stream().filter(j -> POSICOES_MEIO.contains(j.getPosicao())).map(Jogador::getOverall));
        this.overallDefesa = media(elenco.stream().filter(j -> POSICOES_DEFESA.contains(j.getPosicao())).map(Jogador::getOverall));
        this.idadeMedia = mediaIdade(elenco);
        this.valorElenco = elenco.stream().map(Jogador::getPrecoPc).filter(java.util.Objects::nonNull).mapToLong(Long::longValue).sum();

        Jogador melhorJogador = elenco.stream()
                .filter(j -> j.getOverall() != null)
                .max(Comparator.comparing(Jogador::getOverall))
                .orElse(null);
        this.melhorJogadorNome = melhorJogador != null ? melhorJogador.getNomeComum() : null;
        this.melhorJogadorOverall = melhorJogador != null ? melhorJogador.getOverall() : null;

        this.elenco = montarElencoComTitulares(elenco);
    }

    private List<JogadorTimeSaidaDto> montarElencoComTitulares(List<Jogador> elenco) {
        Map<String, List<Jogador>> porPosicao = new LinkedHashMap<>();
        for (Jogador jogador : elenco) {
            porPosicao.computeIfAbsent(jogador.getPosicao(), k -> new ArrayList<>()).add(jogador);
        }
        for (List<Jogador> jogadores : porPosicao.values()) {
            jogadores.sort(Comparator.comparing(Jogador::getOverall, Comparator.nullsFirst(Comparator.naturalOrder())).reversed());
        }

        Set<Long> titulares = new java.util.HashSet<>();
        for (Map.Entry<String, Integer> vaga : FORMACAO_4_3_3.entrySet()) {
            List<Jogador> candidatos = porPosicao.getOrDefault(vaga.getKey(), List.of());
            int quantidade = Math.min(vaga.getValue(), candidatos.size());
            for (int i = 0; i < quantidade; i++) {
                titulares.add(candidatos.get(i).getId());
            }
        }

        return elenco.stream()
                .map(j -> new JogadorTimeSaidaDto(j, titulares.contains(j.getId())))
                .toList();
    }

    private Double media(java.util.stream.Stream<Short> valores) {
        List<Short> lista = valores.filter(java.util.Objects::nonNull).toList();
        if (lista.isEmpty()) {
            return null;
        }
        return lista.stream().mapToInt(Short::intValue).average().orElse(0);
    }

    private Double mediaIdade(List<Jogador> elenco) {
        List<Short> idades = elenco.stream().map(Jogador::getIdade).filter(java.util.Objects::nonNull).toList();
        if (idades.isEmpty()) {
            return null;
        }
        return idades.stream().mapToInt(Short::intValue).average().orElse(0);
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

    public String getPaisNome() {
        return paisNome;
    }

    public String getCidade() {
        return cidade;
    }

    public String getEstadio() {
        return estadio;
    }

    public Integer getCapacidadeEstadio() {
        return capacidadeEstadio;
    }

    public Integer getFundacao() {
        return fundacao;
    }

    public String getResumoHistorico() {
        return resumoHistorico;
    }

    public Double getOverallMedio() {
        return overallMedio;
    }

    public Double getOverallAtaque() {
        return overallAtaque;
    }

    public Double getOverallMeio() {
        return overallMeio;
    }

    public Double getOverallDefesa() {
        return overallDefesa;
    }

    public Double getIdadeMedia() {
        return idadeMedia;
    }

    public Long getValorElenco() {
        return valorElenco;
    }

    public Long getOrcamento() {
        return orcamento;
    }

    public String getRivalNome() {
        return rivalNome;
    }

    public Integer getPrestigioInternacional() {
        return prestigioInternacional;
    }

    public Integer getPrestigioLocal() {
        return prestigioLocal;
    }

    public String getMelhorJogadorNome() {
        return melhorJogadorNome;
    }

    public Short getMelhorJogadorOverall() {
        return melhorJogadorOverall;
    }

    public List<UniformeSaidaDto> getUniformes() {
        return uniformes;
    }

    public List<JogadorTimeSaidaDto> getElenco() {
        return elenco;
    }

    public List<String> getTitulos() {
        return titulos;
    }
}

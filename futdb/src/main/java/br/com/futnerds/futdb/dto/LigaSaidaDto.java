package br.com.futnerds.futdb.dto;

public class LigaSaidaDto {
    private Long id;
    private String nome;
    private String paisNome;
    private String paisCodigo;
    private long quantidadeClubes;

    public LigaSaidaDto(Long id, String nome, String paisNome, String paisCodigo, long quantidadeClubes) {
        this.id = id;
        this.nome = nome;
        this.paisNome = paisNome;
        this.paisCodigo = paisCodigo;
        this.quantidadeClubes = quantidadeClubes;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getPaisNome() {
        return paisNome;
    }

    public String getPaisCodigo() {
        return paisCodigo;
    }

    public long getQuantidadeClubes() {
        return quantidadeClubes;
    }
}

package br.com.futnerds.futdb.dto;

public class LigaResumoDto {
    private String nome;
    private long quantidadeClubes;

    public LigaResumoDto(String nome, long quantidadeClubes) {
        this.nome = nome;
        this.quantidadeClubes = quantidadeClubes;
    }

    public String getNome() {
        return nome;
    }

    public long getQuantidadeClubes() {
        return quantidadeClubes;
    }
}

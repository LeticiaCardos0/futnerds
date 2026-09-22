package br.com.futnerds.futdb.dto;

import br.com.futnerds.futdb.model.Uniforme;

public class UniformeSaidaDto {

    private String tipo;
    private String imagemUrl;
    private String temporada;

    public UniformeSaidaDto(Uniforme uniforme) {
        this.tipo = uniforme.getTipo();
        this.imagemUrl = uniforme.getImagemUrl();
        this.temporada = uniforme.getTemporada();
    }

    public String getTipo() {
        return tipo;
    }

    public String getImagemUrl() {
        return imagemUrl;
    }

    public String getTemporada() {
        return temporada;
    }
}

package br.com.futnerds.futdb.client;

import br.com.futnerds.futdb.dto.TheSportsDbEquipmentDto;

import java.util.List;

public record BuscaEquipamentoResultado(boolean sucesso, MotivoFalha motivoFalha, List<TheSportsDbEquipmentDto> equipamentos) {

    public enum MotivoFalha {
        SEM_DADOS,
        RATE_LIMIT,
        ERRO
    }

    public static BuscaEquipamentoResultado sucesso(List<TheSportsDbEquipmentDto> equipamentos) {
        return new BuscaEquipamentoResultado(true, null, equipamentos);
    }

    public static BuscaEquipamentoResultado semDados() {
        return new BuscaEquipamentoResultado(false, MotivoFalha.SEM_DADOS, List.of());
    }

    public static BuscaEquipamentoResultado rateLimit() {
        return new BuscaEquipamentoResultado(false, MotivoFalha.RATE_LIMIT, List.of());
    }

    public static BuscaEquipamentoResultado erro() {
        return new BuscaEquipamentoResultado(false, MotivoFalha.ERRO, List.of());
    }
}

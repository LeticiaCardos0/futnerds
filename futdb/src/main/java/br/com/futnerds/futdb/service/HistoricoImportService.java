package br.com.futnerds.futdb.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class HistoricoImportService {

    private static final String CAMINHO_CSV = "dados/historico_overall_consolidado.csv";
    // players.csv (FC27 em diante) não traz mais fifa_version/potential -
    // ver importarEdicaoAtual().
    private static final String CAMINHO_CSV_ATUAL = "dados/players.csv";
    private static final int TAMANHO_LOTE = 2000;

    private static final String SQL_UPSERT =
            "INSERT INTO jogador_historico (jogador_id, edicao, overall, potencial, clube, liga) " +
            "VALUES (?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT (jogador_id, edicao) DO UPDATE SET " +
            "overall = EXCLUDED.overall, potencial = EXCLUDED.potencial, " +
            "clube = EXCLUDED.clube, liga = EXCLUDED.liga";

    private final JdbcTemplate jdbcTemplate;

    public HistoricoImportService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public String importar() {
        int importadas = 0;
        int puladas = 0;
        List<Object[]> lote = new ArrayList<>(TAMANHO_LOTE);

        try (BufferedReader reader = Files.newBufferedReader(Path.of(CAMINHO_CSV), StandardCharsets.UTF_8)) {
            String linhaCabecalho = reader.readLine();
            if (linhaCabecalho == null) {
                return "0 linhas importadas, 0 linhas puladas";
            }
            Map<String, Integer> colunas = CsvUtils.indexarColunas(CsvUtils.parseLinha(linhaCabecalho));

            String linha;
            while ((linha = reader.readLine()) != null) {
                if (linha.isBlank()) {
                    continue;
                }
                List<String> campos = CsvUtils.parseLinha(linha);

                try {
                    Long jogadorId = CsvUtils.parseLong(CsvUtils.valor(campos, colunas, "player_id"));
                    Short overall = CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "overall"));
                    Short edicao = truncarEdicao(CsvUtils.valor(campos, colunas, "fifa_version"));

                    if (jogadorId == null || overall == null || edicao == null) {
                        puladas++;
                        continue;
                    }

                    Short potencial = CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "potential"));
                    String clube = CsvUtils.valor(campos, colunas, "club_name");
                    String liga = CsvUtils.valor(campos, colunas, "league_name");

                    lote.add(new Object[]{jogadorId, edicao, overall, potencial, clube, liga});
                    importadas++;

                    if (lote.size() == TAMANHO_LOTE) {
                        jdbcTemplate.batchUpdate(SQL_UPSERT, lote);
                        lote.clear();
                    }
                } catch (NumberFormatException e) {
                    puladas++;
                }
            }

            if (!lote.isEmpty()) {
                jdbcTemplate.batchUpdate(SQL_UPSERT, lote);
            }
        } catch (IOException e) {
            throw new RuntimeException("Erro ao ler arquivo CSV: " + e.getMessage(), e);
        }

        return importadas + " linhas importadas, " + puladas + " linhas puladas";
    }

    private Short truncarEdicao(String valor) {
        if (valor == null) {
            return null;
        }
        String parteInteira = valor.contains(".") ? valor.substring(0, valor.indexOf('.')) : valor;
        try {
            return Short.valueOf(parteInteira);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Acrescenta ao histórico a edição "atual" (FC27 em diante), lida
     * direto de dados/players.csv em vez do arquivo consolidado antigo -
     * esse dataset não tem mais fifa_version/potential, então:
     *  - a edição vem da coluna `edition` (ex.: "fc27" -> 27), extraindo
     *    só os dígitos, pra funcionar sozinho nas próximas edições
     *    ("fc28" -> 28) sem precisar tocar nesse código de novo;
     *  - `potencial` fica sempre null pra essa edição (coluna não existe
     *    mais no dataset novo);
     *  - só processa gender == "Men's Football", mesmo filtro do
     *    CsvImportService, já que hoje não existe Jogador pras jogadoras.
     * Idempotente igual o importar() de cima: reimportar não duplica
     * (mesma constraint UNIQUE jogador_id+edicao).
     */
    @Transactional
    public String importarEdicaoAtual() {
        int importadas = 0;
        int puladas = 0;
        List<Object[]> lote = new ArrayList<>(TAMANHO_LOTE);

        try (BufferedReader reader = Files.newBufferedReader(Path.of(CAMINHO_CSV_ATUAL), StandardCharsets.UTF_8)) {
            String linhaCabecalho = reader.readLine();
            if (linhaCabecalho == null) {
                return "0 linhas importadas, 0 linhas puladas";
            }
            Map<String, Integer> colunas = CsvUtils.indexarColunas(CsvUtils.parseLinha(linhaCabecalho));

            String linha;
            while ((linha = reader.readLine()) != null) {
                if (linha.isBlank()) {
                    continue;
                }
                List<String> campos = CsvUtils.parseLinha(linha);

                String genero = CsvUtils.valor(campos, colunas, "gender");
                if (genero != null && !genero.equalsIgnoreCase("Men's Football")) {
                    puladas++;
                    continue;
                }

                try {
                    Long jogadorId = CsvUtils.parseLong(CsvUtils.valor(campos, colunas, "player_id"));
                    Short overall = CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "overall_rating"));
                    Short edicao = extrairEdicao(CsvUtils.valor(campos, colunas, "edition"));

                    if (jogadorId == null || overall == null || edicao == null) {
                        puladas++;
                        continue;
                    }

                    String clube = CsvUtils.valor(campos, colunas, "club");
                    String liga = CsvUtils.valor(campos, colunas, "league");

                    lote.add(new Object[]{jogadorId, edicao, overall, null, clube, liga});
                    importadas++;

                    if (lote.size() == TAMANHO_LOTE) {
                        jdbcTemplate.batchUpdate(SQL_UPSERT, lote);
                        lote.clear();
                    }
                } catch (NumberFormatException e) {
                    puladas++;
                }
            }

            if (!lote.isEmpty()) {
                jdbcTemplate.batchUpdate(SQL_UPSERT, lote);
            }
        } catch (IOException e) {
            throw new RuntimeException("Erro ao ler arquivo CSV: " + e.getMessage(), e);
        }

        return importadas + " linhas importadas, " + puladas + " linhas puladas";
    }

    private Short extrairEdicao(String edition) {
        if (edition == null) {
            return null;
        }
        String digitos = edition.replaceAll("[^0-9]", "");
        if (digitos.isBlank()) {
            return null;
        }
        try {
            return Short.valueOf(digitos);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

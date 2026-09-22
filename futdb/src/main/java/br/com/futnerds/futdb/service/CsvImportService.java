package br.com.futnerds.futdb.service;

import br.com.futnerds.futdb.model.Clube;
import br.com.futnerds.futdb.model.Jogador;
import br.com.futnerds.futdb.model.Liga;
import br.com.futnerds.futdb.model.Nacao;
import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.repository.JogadorRepository;
import br.com.futnerds.futdb.repository.LigaRepository;
import br.com.futnerds.futdb.repository.NacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ATUALIZADO para FC 27 (dataset mikedpad/ea-sports-fc27-player-ratings).
 *
 * Principais mudanças em relação ao formato antigo (sofifa/Kaggle, até FC 26):
 *  - Não existe mais nationality_id / league_id / club_team_id numéricos.
 *    Nação, liga e clube agora são resolvidos pelo NOME, e o id interno é
 *    gerado de forma determinística a partir do nome (gerarIdPorNome), pra
 *    que reimportar o mesmo arquivo não crie linhas duplicadas.
 *  - Não existe mais fifa_version / fifa_update (o arquivo já vem com uma
 *    única linha por jogador), então a lógica de "pegar só a versão mais
 *    recente" foi removida.
 *  - Não existe mais player_face_url: fotoUrl deixa de ser sobrescrita no
 *    import (mantém o que já tiver sido preenchido por outro fluxo, se
 *    houver; senão fica null).
 *  - player_traits virou playstyles (formato diferente, ex: "Incisive Pass+").
 *    Continua sendo salvo no campo `traits`, que é o que o frontend já lê.
 *  - defending_marking_awareness virou defending_awareness.
 *  - O CSV agora traz birthdate em vez de age pronta -> calculamos a idade.
 *  - O CSV traz jogadoras (coluna gender = "Female"). Como hoje o Jogador
 *    não tem campo de gênero e o restante do app (escudos via TheSportsDB,
 *    destaque de ligas etc.) foi pensado só pro futebol masculino, por ora
 *    o import PULA linhas com gender != "Male". Ver observação no final
 *    da classe se quiser habilitar futebol feminino depois.
 */
@Service
public class CsvImportService {

    private static final Logger logger = LoggerFactory.getLogger(CsvImportService.class);
    private static final String CAMINHO_CSV = "dados/players.csv";
    private static final DateTimeFormatter FORMATO_DATA = DateTimeFormatter.ISO_LOCAL_DATE;
    // Data de referência pro cálculo de idade quando o CSV não traz idade
    // pronta. Usamos o lançamento do FC 27 como "hoje" do jogo.
    private static final LocalDate DATA_REFERENCIA = LocalDate.of(2026, 9, 25);

    private final NacaoRepository nacaoRepository;
    private final LigaRepository ligaRepository;
    private final ClubeRepository clubeRepository;
    private final JogadorRepository jogadorRepository;

    public CsvImportService(NacaoRepository nacaoRepository,
                             LigaRepository ligaRepository,
                             ClubeRepository clubeRepository,
                             JogadorRepository jogadorRepository) {
        this.nacaoRepository = nacaoRepository;
        this.ligaRepository = ligaRepository;
        this.clubeRepository = clubeRepository;
        this.jogadorRepository = jogadorRepository;
    }

    @Transactional
    public void importar() {
        try (BufferedReader reader = Files.newBufferedReader(Path.of(CAMINHO_CSV), StandardCharsets.UTF_8)) {
            String linhaCabecalho = reader.readLine();
            if (linhaCabecalho == null) {
                return;
            }
            Map<String, Integer> colunas = CsvUtils.indexarColunas(CsvUtils.parseLinha(linhaCabecalho));

            // O arquivo do FC 27 tem uma linha por jogador (sem histórico de
            // versões dentro do mesmo CSV), mas ainda assim deduplicamos por
            // player_id por segurança, mantendo a última ocorrência.
            Map<Long, List<String>> porJogador = new LinkedHashMap<>();

            String linha;
            while ((linha = reader.readLine()) != null) {
                if (linha.isBlank()) {
                    continue;
                }
                List<String> campos = CsvUtils.parseLinha(linha);
                Long playerId = CsvUtils.parseLong(CsvUtils.valor(campos, colunas, "player_id"));
                if (playerId == null) {
                    continue;
                }
                porJogador.put(playerId, campos);
            }

            int importados = 0;
            int pulados = 0;
            for (List<String> campos : porJogador.values()) {
                if (importarJogador(campos, colunas)) {
                    importados++;
                } else {
                    pulados++;
                }
            }
            logger.info("Importação de jogadores concluída: {} importados (Men's Football), {} pulados (Women's Football) de {} linhas únicas.",
                    importados, pulados, porJogador.size());
        } catch (IOException e) {
            throw new RuntimeException("Erro ao ler arquivo CSV: " + e.getMessage(), e);
        }
    }

    private boolean importarJogador(List<String> campos, Map<String, Integer> colunas) {
        // A coluna vem como "Men's Football" / "Women's Football" (não
        // "Male"/"Female" como em outros datasets) — conferido direto no
        // arquivo real antes de fechar esse filtro.
        String genero = CsvUtils.valor(campos, colunas, "gender");
        if (genero != null && !genero.equalsIgnoreCase("Men's Football")) {
            // Futebol feminino ainda não é suportado no restante do app.
            return false;
        }

        Nacao nacao = resolverNacao(CsvUtils.valor(campos, colunas, "nationality"));
        Liga liga = resolverLiga(CsvUtils.valor(campos, colunas, "league"));
        Clube clube = resolverClube(CsvUtils.valor(campos, colunas, "club"), liga);

        Long playerId = CsvUtils.parseLong(CsvUtils.valor(campos, colunas, "player_id"));

        Jogador jogador = jogadorRepository.findById(playerId).orElseGet(Jogador::new);
        jogador.setId(playerId);

        String nomeComum = CsvUtils.valor(campos, colunas, "common_name");
        String primeiroNome = CsvUtils.valor(campos, colunas, "first_name");
        String ultimoNome = CsvUtils.valor(campos, colunas, "last_name");
        String nomeCompleto = (primeiroNome != null || ultimoNome != null)
                ? String.join(" ", valorOuVazio(primeiroNome), valorOuVazio(ultimoNome)).trim()
                : nomeComum;

        jogador.setNome(nomeCompleto != null && !nomeCompleto.isBlank() ? nomeCompleto : nomeComum);
        jogador.setNomeComum(nomeComum != null ? nomeComum : nomeCompleto);

        jogador.setIdade(calcularIdade(CsvUtils.valor(campos, colunas, "birthdate")));
        jogador.setAltura(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "height_cm")));
        jogador.setPeso(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "weight_kg")));
        jogador.setPeDominante(CsvUtils.valor(campos, colunas, "preferred_foot"));

        List<String> posicoes = separarPosicoes(
                CsvUtils.valor(campos, colunas, "position"),
                CsvUtils.valor(campos, colunas, "alternate_positions"));
        jogador.setPosicao(posicoes.isEmpty() ? null : posicoes.get(0));
        jogador.setPosicoesAlternativas(posicoes.size() > 1
                ? String.join(",", posicoes.subList(1, posicoes.size()))
                : null);

        jogador.setOverall(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "overall_rating")));
        // potential não existe mais nesta versão do dataset — mantém o que
        // já estava salvo (não sobrescreve com null) caso já tenha vindo
        // de uma importação anterior.
        Short potencialNovo = CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "potential"));
        if (potencialNovo != null) {
            jogador.setPotencial(potencialNovo);
        }

        jogador.setNacao(nacao);
        jogador.setClube(clube);
        jogador.setLiga(liga);

        // player_face_url não existe mais no CSV: só sobrescreve se algum
        // dia a coluna voltar a existir; caso contrário preserva o que já
        // tiver sido preenchido por outro fluxo (ou fica null).
        String fotoUrl = CsvUtils.valor(campos, colunas, "player_face_url");
        if (fotoUrl != null) {
            jogador.setFotoUrl(fotoUrl);
        }

        // value_eur / wage_eur não existem nesta versão do dataset.
        Long valorNovo = CsvUtils.parseLong(CsvUtils.valor(campos, colunas, "value_eur"));
        if (valorNovo != null) {
            jogador.setPrecoPc(valorNovo);
        }
        Long salarioNovo = CsvUtils.parseLong(CsvUtils.valor(campos, colunas, "wage_eur"));
        if (salarioNovo != null) {
            jogador.setSalario(salarioNovo);
        }

        jogador.setVelocidade(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "pace")));
        jogador.setFinalizacao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "shooting")));
        jogador.setPasse(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "passing")));
        jogador.setDrible(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "dribbling")));
        // player_traits virou playstyles no FC 27 (formato "Incisive Pass+",
        // separado por vírgula) — segue no mesmo campo `traits`, que é o
        // que o traits.util.ts do frontend já espera.
        jogador.setTraits(CsvUtils.valor(campos, colunas, "playstyles"));
        jogador.setCruzamento(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "attacking_crossing")));
        jogador.setFinalizacaoDetalhada(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "attacking_finishing")));
        jogador.setCabeceio(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "attacking_heading_accuracy")));
        jogador.setPasseCurto(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "attacking_short_passing")));
        jogador.setVoleio(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "attacking_volleys")));
        jogador.setDribleDetalhado(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "skill_dribbling")));
        jogador.setCurva(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "skill_curve")));
        jogador.setPrecisaoFalta(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "skill_fk_accuracy")));
        jogador.setPasseLongo(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "skill_long_passing")));
        jogador.setControleDeBola(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "skill_ball_control")));
        jogador.setAceleracao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "movement_acceleration")));
        jogador.setVelocidadeSprint(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "movement_sprint_speed")));
        jogador.setAgilidade(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "movement_agility")));
        jogador.setReacoes(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "movement_reactions")));
        jogador.setEquilibrio(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "movement_balance")));
        jogador.setPotenciaChute(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "power_shot_power")));
        jogador.setImpulsao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "power_jumping")));
        jogador.setFolego(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "power_stamina")));
        jogador.setForca(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "power_strength")));
        jogador.setChutesDeLonge(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "power_long_shots")));
        jogador.setAgressao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "mentality_aggression")));
        jogador.setInterceptacao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "mentality_interceptions")));
        jogador.setPosicionamento(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "mentality_positioning")));
        jogador.setVisao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "mentality_vision")));
        jogador.setPenaltis(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "mentality_penalties")));
        jogador.setCompostura(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "mentality_composure")));
        // defending_marking_awareness virou defending_awareness no FC 27.
        jogador.setMarcacao(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "defending_awareness")));
        jogador.setDesarmeEmPe(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "defending_standing_tackle")));
        jogador.setDesarmeDeslizante(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "defending_sliding_tackle")));
        jogador.setGoleiroElasticidade(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "goalkeeping_diving")));
        jogador.setGoleiroAgarrar(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "goalkeeping_handling")));
        jogador.setGoleiroChute(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "goalkeeping_kicking")));
        jogador.setGoleiroPosicionamento(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "goalkeeping_positioning")));
        jogador.setGoleiroReflexos(CsvUtils.parseShort(CsvUtils.valor(campos, colunas, "goalkeeping_reflexes")));
        jogador.setAtualizadoEm(LocalDateTime.now());
        jogadorRepository.save(jogador);
        return true;
    }

    private Nacao resolverNacao(String nomeNacao) {
        if (nomeNacao == null || nomeNacao.isBlank()) {
            return null;
        }
        Long nacaoId = gerarIdPorNome(nomeNacao);
        Nacao nacao = nacaoRepository.findById(nacaoId).orElseGet(Nacao::new);
        nacao.setId(nacaoId);
        nacao.setNome(nomeNacao);
        return nacaoRepository.save(nacao);
    }

    private Liga resolverLiga(String nomeLiga) {
        if (nomeLiga == null || nomeLiga.isBlank()) {
            return null;
        }
        Long ligaId = gerarIdPorNome(nomeLiga);
        Liga liga = ligaRepository.findById(ligaId).orElseGet(Liga::new);
        liga.setId(ligaId);
        liga.setNome(nomeLiga);

        String nomePais = MapaLigaPais.LIGA_PARA_PAIS.get(nomeLiga);
        liga.setNacao(nomePais == null ? null : resolverNacao(nomePais));

        return ligaRepository.save(liga);
    }

    private Clube resolverClube(String nomeClube, Liga liga) {
        if (nomeClube == null || nomeClube.isBlank()) {
            return null;
        }
        Long clubeId = gerarIdPorNome(nomeClube);
        Clube clube = clubeRepository.findById(clubeId).orElseGet(Clube::new);
        clube.setId(clubeId);
        clube.setNome(nomeClube);
        clube.setLiga(liga);
        return clubeRepository.save(clube);
    }

    /**
     * Gera um id numérico determinístico a partir do nome (nação, liga ou
     * clube), já que o CSV do FC 27 não traz mais IDs numéricos prontos.
     * Usa String.hashCode(), que é especificado pela própria linguagem Java
     * e garantido estável entre execuções/JVMs — ou seja, reimportar o
     * mesmo arquivo várias vezes sempre gera o mesmo id pro mesmo nome
     * (idempotente), sem criar linhas duplicadas.
     *
     * Colisão é teoricamente possível mas extremamente improvável pro
     * volume de nomes distintos aqui (centenas de ligas/nações, ~700 clubes).
     */
    private Long gerarIdPorNome(String nome) {
        String chave = nome.trim().toUpperCase();
        return (long) chave.hashCode();
    }

    private List<String> separarPosicoes(String posicaoPrincipal, String posicoesAlternativas) {
        List<String> posicoes = new ArrayList<>();
        if (posicaoPrincipal != null && !posicaoPrincipal.isBlank()) {
            posicoes.add(posicaoPrincipal.trim());
        }
        if (posicoesAlternativas != null && !posicoesAlternativas.isBlank()) {
            // No FC 27 as posições alternativas vêm separadas por espaço
            // (ex.: "CAM ST"), diferente do antigo formato separado por vírgula.
            for (String posicao : posicoesAlternativas.trim().split("\\s+")) {
                if (!posicao.isBlank() && !posicoes.contains(posicao)) {
                    posicoes.add(posicao);
                }
            }
        }
        return posicoes;
    }

    private Short calcularIdade(String birthdate) {
        if (birthdate == null || birthdate.isBlank()) {
            return null;
        }
        try {
            LocalDate nascimento = LocalDate.parse(birthdate.trim(), FORMATO_DATA);
            int idade = DATA_REFERENCIA.getYear() - nascimento.getYear();
            if (DATA_REFERENCIA.getMonthValue() < nascimento.getMonthValue()
                    || (DATA_REFERENCIA.getMonthValue() == nascimento.getMonthValue()
                        && DATA_REFERENCIA.getDayOfMonth() < nascimento.getDayOfMonth())) {
                idade--;
            }
            return (short) idade;
        } catch (Exception e) {
            return null;
        }
    }

    private String valorOuVazio(String valor) {
        return valor == null ? "" : valor;
    }

    // NOTA sobre futebol feminino: pra habilitar no futuro, basta remover o
    // filtro de gender no início de importarJogador() e adicionar um campo
    // `genero` na entidade Jogador (hoje ele não existe). Vale lembrar que
    // o EscudoImportService busca escudo de clube na TheSportsDB só pelo
    // nome, e times femininos provavelmente não estão nessa base — os
    // clubes femininos ficariam sem escudo (o que já é tratado com
    // fallback no frontend).
}
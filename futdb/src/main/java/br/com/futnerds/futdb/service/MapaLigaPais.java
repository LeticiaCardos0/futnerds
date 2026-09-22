package br.com.futnerds.futdb.service;

import java.util.Map;

/**
 * ATUALIZADO para FC 27: o dataset novo (mikedpad) não tem mais league_id
 * numérico estável (isso era uma coluna própria do formato sofifa/Kaggle
 * usado até o FC 26). A partir de agora o mapeamento é pelo NOME da liga
 * exatamente como ele vem na coluna `league` do CSV da EA.
 *
 * Ligas continentais (Libertadores, Sudamericana) não têm país e por isso
 * não entram aqui — resolverLiga() simplesmente deixa a nação null pra elas.
 */
public class MapaLigaPais {
    public static final Map<String, String> LIGA_PARA_PAIS = Map.ofEntries(
        Map.entry("Bundesliga", "Germany"),
        Map.entry("Bundesliga 2", "Germany"),
        Map.entry("3. Liga", "Germany"),
        Map.entry("Ö. Bundesliga", "Austria"),
        Map.entry("LALIGA EA SPORTS", "Spain"),
        Map.entry("LALIGA HYPERMOTION", "Spain"),
        Map.entry("Premier League", "England"),
        Map.entry("EFL Championship", "England"),
        Map.entry("EFL League One", "England"),
        Map.entry("EFL League Two", "England"),
        Map.entry("Ligue 1 McDonald's", "France"),
        Map.entry("Ligue 2 BKT", "France"),
        Map.entry("Serie A Enilive", "Italy"),
        Map.entry("Serie BKT", "Italy"),
        Map.entry("Eredivisie", "Netherlands"),
        Map.entry("Liga Portugal", "Portugal"),
        Map.entry("Liga do Brasil", "Brazil"),
        Map.entry("MLS", "United States"),
        Map.entry("Trendyol Süper Lig", "Türkiye"),
        Map.entry("Eliteserien", "Norway"),
        Map.entry("Allsvenskan", "Sweden"),
        Map.entry("SUPERLIGA", "Denmark"),
        Map.entry("Ekstraklasa", "Poland"),
        Map.entry("K League 1", "Korea Republic"),
        Map.entry("Isuzu UTE A League", "Australia"),
        Map.entry("Finnliiga", "Finland"),
        Map.entry("Magyar Liga", "Hungary"),
        Map.entry("SSE Airtricity Men's Premier Division", "Republic of Ireland"),
        Map.entry("Liga Hrvatska", "Croatia"),
        Map.entry("Česká Liga", "Czechia"),
        Map.entry("Liga Colombia", "Colombia"),
        Map.entry("LPF", "Argentina"),
        Map.entry("Liga Azerbaijan", "Azerbaijan"),
        Map.entry("Brack Super League", "Switzerland"),
        Map.entry("Hellas Liga", "Greece"),
        Map.entry("CSL", "China PR"),
        Map.entry("1A Pro League", "Belgium"),
        Map.entry("ROSHN Saudi League", "Saudi Arabia"),
        Map.entry("Primera Division", "Uruguay"),
        Map.entry("Liga BBVA MX", "Mexico"),
        Map.entry("Liga Bulgaria", "Bulgaria"),
        Map.entry("Liga Cyprus", "Cyprus"),
        Map.entry("Ukrayina Liha", "Ukraine"),
        Map.entry("United Emirates League", "United Arab Emirates"),
        Map.entry("Thailand League", "Thailand"),
        Map.entry("ISL", "India"),
        Map.entry("Iceland League", "Iceland"),
        Map.entry("Scottish Premiership", "Scotland"),
        Map.entry("Metropolitan Division", "United States")
        // Ligas femininas (Arkema PL, Barclays WSL, NWSL, Liga F Moeve etc.)
        // ficam de fora por enquanto — hoje o Jogador não tem campo de
        // gênero e o import atual pula essas jogadoras (ver CsvImportService).
    );
}
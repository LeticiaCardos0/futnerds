package br.com.futnerds.futdb.client;

import br.com.futnerds.futdb.dto.TheSportsDbEquipmentDto;
import br.com.futnerds.futdb.dto.TheSportsDbEquipmentResponseDto;
import br.com.futnerds.futdb.dto.TheSportsDbSearchResponseDto;
import br.com.futnerds.futdb.dto.TheSportsDbTeamDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class TheSportsDbClient {

    private static final Logger logger = LoggerFactory.getLogger(TheSportsDbClient.class);
    private static final Pattern DIACRITICOS = Pattern.compile("\\p{M}");

    @Value("${thesportsdb.api-key}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();

    public TheSportsDbTeamDto buscarEscudoPorNome(String nomeTime) throws InterruptedException {
        Set<String> variantes = new LinkedHashSet<>();
        variantes.add(nomeTime);
        String semAcento = removerAcentos(nomeTime);
        variantes.add(semAcento);
        variantes.add(semAcento.replace("-", " "));
        String semLetrasEspeciais = substituirLetrasEspeciais(semAcento);
        variantes.add(semLetrasEspeciais);
        variantes.add(semLetrasEspeciais.replace("-", " "));

        for (String variante : variantes) {
            TheSportsDbTeamDto resultado = buscar(variante);
            Thread.sleep(2100); // respeita o limite de 30 req/min da TheSportsDB (~1 a cada 2s)
            if (resultado != null && resultado.getStrBadge() != null) {
                return resultado;
            }
        }
        return null;
    }

    public BuscaEquipamentoResultado buscarEquipamentos(String idTeam, Long clubeId, String nomeClube) throws InterruptedException {
        try {
            String url = "https://www.thesportsdb.com/api/v1/json/" + apiKey + "/lookupequipment.php?id=" +
                    URLEncoder.encode(idTeam, StandardCharsets.UTF_8);
            TheSportsDbEquipmentResponseDto resposta = restClient.get().uri(url).retrieve().body(TheSportsDbEquipmentResponseDto.class);
            if (resposta != null && resposta.getEquipment() != null && !resposta.getEquipment().isEmpty()) {
                return BuscaEquipamentoResultado.sucesso(resposta.getEquipment());
            }
            return BuscaEquipamentoResultado.semDados();
        } catch (HttpClientErrorException.TooManyRequests e) {
            logger.warn("[TheSportsDB] Rate limit excedido (429) ao buscar equipamento do clube {} ({})", clubeId, nomeClube);
            return BuscaEquipamentoResultado.rateLimit();
        } catch (Exception e) {
            // time sem equipamentos cadastrados ou erro pontual - não interrompe o lote inteiro
            logger.info("[TheSportsDB] Falha ao buscar equipamento do clube {} ({}): {}", clubeId, nomeClube, e.getMessage());
            return BuscaEquipamentoResultado.erro();
        } finally {
            Thread.sleep(30_500); // respeita o limite de 2 req/min do plano free (~1 a cada 30s)
        }
    }

    private TheSportsDbTeamDto buscar(String nomeTime) {
        try {
            String url = "https://www.thesportsdb.com/api/v1/json/" + apiKey + "/searchteams.php?t=" +
                    URLEncoder.encode(nomeTime, StandardCharsets.UTF_8);
            TheSportsDbSearchResponseDto resposta = restClient.get().uri(url).retrieve().body(TheSportsDbSearchResponseDto.class);
            if (resposta != null && resposta.getTeams() != null && !resposta.getTeams().isEmpty()) {
                return resposta.getTeams().get(0);
            }
        } catch (Exception e) {
            // time não encontrado ou erro pontual - não interrompe o lote inteiro
        }
        return null;
    }

    private String removerAcentos(String texto) {
        String normalizado = Normalizer.normalize(texto, Normalizer.Form.NFD);
        return DIACRITICOS.matcher(normalizado).replaceAll("");
    }

    private String substituirLetrasEspeciais(String texto) {
        return texto
                .replace("ø", "o").replace("Ø", "O")
                .replace("ł", "l").replace("Ł", "L")
                .replace("ß", "ss")
                .replace("ı", "i").replace("İ", "I")
                .replace("æ", "ae").replace("Æ", "AE")
                .replace("œ", "oe").replace("Œ", "OE")
                .replace("đ", "d").replace("Đ", "D")
                .replace("ð", "d").replace("Ð", "D")
                .replace("þ", "th").replace("Þ", "Th");
    }
}

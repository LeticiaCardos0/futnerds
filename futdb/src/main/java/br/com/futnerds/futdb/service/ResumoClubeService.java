package br.com.futnerds.futdb.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;

/**
 * Resumo histórico de cada clube, lido de resources/resumos-clubes.json.
 *
 * O arquivo é indexado pelo nome do clube exatamente como está no banco (os
 * nomes do FC 26: "Milano FC", "Nott'm Forest", "Paris SG"...). Fica fora do
 * banco de propósito: o esquema é validado (ddl-auto=validate) e recriado a
 * partir do backup, então um arquivo versionado chega a toda máquina sem
 * migração.
 */
@Service
public class ResumoClubeService {

    private static final String ARQUIVO = "resumos-clubes.json";

    private final Map<String, String> resumosPorNome;

    public ResumoClubeService(ObjectMapper objectMapper) {
        try (InputStream entrada = new ClassPathResource(ARQUIVO).getInputStream()) {
            this.resumosPorNome = Map.copyOf(objectMapper.readValue(entrada, new TypeReference<Map<String, String>>() {}));
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível ler " + ARQUIVO, e);
        }
    }

    public String buscarPorNome(String nomeClube) {
        return nomeClube == null ? null : resumosPorNome.get(nomeClube);
    }
}

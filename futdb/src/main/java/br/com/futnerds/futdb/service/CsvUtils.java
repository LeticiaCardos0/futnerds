package br.com.futnerds.futdb.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CsvUtils {

    private CsvUtils() {
    }

    public static List<String> parseLinha(String linha) {
        List<String> campos = new ArrayList<>();
        StringBuilder atual = new StringBuilder();
        boolean dentroDeAspas = false;

        for (int i = 0; i < linha.length(); i++) {
            char c = linha.charAt(i);
            if (dentroDeAspas) {
                if (c == '"') {
                    if (i + 1 < linha.length() && linha.charAt(i + 1) == '"') {
                        atual.append('"');
                        i++;
                    } else {
                        dentroDeAspas = false;
                    }
                } else {
                    atual.append(c);
                }
            } else {
                if (c == '"') {
                    dentroDeAspas = true;
                } else if (c == ',') {
                    campos.add(atual.toString());
                    atual.setLength(0);
                } else {
                    atual.append(c);
                }
            }
        }
        campos.add(atual.toString());
        return campos;
    }

    public static Map<String, Integer> indexarColunas(List<String> cabecalho) {
        Map<String, Integer> colunas = new HashMap<>();
        for (int i = 0; i < cabecalho.size(); i++) {
            colunas.put(cabecalho.get(i), i);
        }
        return colunas;
    }

    public static String valor(List<String> campos, Map<String, Integer> colunas, String nomeColuna) {
        Integer indice = colunas.get(nomeColuna);
        if (indice == null || indice >= campos.size()) {
            return null;
        }
        String valor = campos.get(indice);
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.trim();
    }

    public static Long parseLong(String valor) {
        return valor == null ? null : Long.valueOf(valor);
    }

    public static Short parseShort(String valor) {
        return valor == null ? null : Short.valueOf(valor);
    }

    public static int parseInt(String valor, int padrao) {
        return valor == null ? padrao : Integer.parseInt(valor);
    }
}

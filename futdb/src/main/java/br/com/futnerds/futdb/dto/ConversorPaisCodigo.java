package br.com.futnerds.futdb.dto;

import java.util.Map;

public class ConversorPaisCodigo {

    private static final String CODIGO_DESCONHECIDO = "un";

    private static final Map<String, String> CODIGOS_POR_PAIS = Map.ofEntries(
            Map.entry("England", "gb-eng"),
            Map.entry("Scotland", "gb-sct"),
            Map.entry("Wales", "gb-wls"),
            Map.entry("Northern Ireland", "gb-nir"),
            Map.entry("Spain", "es"),
            Map.entry("France", "fr"),
            Map.entry("Germany", "de"),
            Map.entry("Italy", "it"),
            Map.entry("Portugal", "pt"),
            Map.entry("Netherlands", "nl"),
            Map.entry("Belgium", "be"),
            Map.entry("Brazil", "br"),
            Map.entry("Argentina", "ar"),
            Map.entry("Uruguay", "uy"),
            Map.entry("Colombia", "co"),
            Map.entry("Chile", "cl"),
            Map.entry("Mexico", "mx"),
            Map.entry("USA", "us"),
            Map.entry("Croatia", "hr"),
            Map.entry("Poland", "pl"),
            Map.entry("Ukraine", "ua"),
            Map.entry("Turkey", "tr"),
            Map.entry("Serbia", "rs"),
            Map.entry("Switzerland", "ch"),
            Map.entry("Austria", "at"),
            Map.entry("Denmark", "dk"),
            Map.entry("Sweden", "se"),
            Map.entry("Norway", "no"),
            Map.entry("Morocco", "ma"),
            Map.entry("Senegal", "sn"),
            Map.entry("Nigeria", "ng"),
            Map.entry("Ghana", "gh"),
            Map.entry("Egypt", "eg"),
            Map.entry("Algeria", "dz"),
            Map.entry("Ivory Coast", "ci"),
            Map.entry("Côte d'Ivoire", "ci"),
            Map.entry("Cameroon", "cm"),
            Map.entry("Japan", "jp"),
            Map.entry("South Korea", "kr"),
            Map.entry("Australia", "au"),
            Map.entry("Canada", "ca"),
            Map.entry("Ecuador", "ec"),
            Map.entry("Peru", "pe"),
            Map.entry("Paraguay", "py"),
            Map.entry("Venezuela", "ve"),
            Map.entry("Bolivia", "bo"),
            Map.entry("Costa Rica", "cr"),
            Map.entry("Republic of Ireland", "ie"),
            Map.entry("Ireland", "ie"),
            Map.entry("Russia", "ru"),
            Map.entry("Czech Republic", "cz"),
            Map.entry("Czechia", "cz"),
            Map.entry("Slovakia", "sk"),
            Map.entry("Slovenia", "si"),
            Map.entry("Hungary", "hu"),
            Map.entry("Romania", "ro"),
            Map.entry("Bulgaria", "bg"),
            Map.entry("Greece", "gr"),
            Map.entry("Finland", "fi"),
            Map.entry("Iceland", "is"),
            Map.entry("Israel", "il"),
            Map.entry("Saudi Arabia", "sa"),
            Map.entry("Qatar", "qa"),
            Map.entry("United Arab Emirates", "ae"),
            Map.entry("China PR", "cn"),
            Map.entry("Georgia", "ge"),
            Map.entry("Bosnia and Herzegovina", "ba"),
            Map.entry("North Macedonia", "mk"),
            Map.entry("Albania", "al"),
            Map.entry("Montenegro", "me"),
            Map.entry("Kosovo", "xk"),
            Map.entry("Indonesia", "id"),
            Map.entry("Azerbaijan", "az"),
            Map.entry("United States", "us"),
            Map.entry("Türkiye", "tr"),
            Map.entry("Korea Republic", "kr")
    );

    private ConversorPaisCodigo() {
    }

    public static String obterCodigo(String nomePais) {
        if (nomePais == null) {
            return CODIGO_DESCONHECIDO;
        }
        return CODIGOS_POR_PAIS.getOrDefault(nomePais, CODIGO_DESCONHECIDO);
    }
}

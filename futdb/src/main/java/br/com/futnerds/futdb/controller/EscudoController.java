package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.client.TheSportsDbClient;
import br.com.futnerds.futdb.dto.TheSportsDbTeamDto;
import br.com.futnerds.futdb.service.EscudoImportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/escudos")
public class EscudoController {

    private final EscudoImportService escudoImportService;
    private final TheSportsDbClient theSportsDbClient;

    public EscudoController(EscudoImportService escudoImportService, TheSportsDbClient theSportsDbClient) {
        this.escudoImportService = escudoImportService;
        this.theSportsDbClient = theSportsDbClient;
    }

    @PostMapping("/importar")
    public Map<String, String> importar() throws InterruptedException {
        String resultado = escudoImportService.importarEscudos();
        Map<String, String> resposta = new HashMap<>();
        resposta.put("mensagem", resultado);
        return resposta;
    }

    @GetMapping("/testar/{nome}")
    public TheSportsDbTeamDto testar(@PathVariable String nome) throws InterruptedException {
        return theSportsDbClient.buscarEscudoPorNome(nome);
    }
}

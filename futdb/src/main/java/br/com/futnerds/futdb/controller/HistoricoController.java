package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.model.JogadorHistorico;
import br.com.futnerds.futdb.repository.JogadorHistoricoRepository;
import br.com.futnerds.futdb.service.HistoricoImportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jogadores")
public class HistoricoController {

    private final JogadorHistoricoRepository historicoRepository;
    private final HistoricoImportService historicoImportService;

    public HistoricoController(JogadorHistoricoRepository historicoRepository, HistoricoImportService historicoImportService) {
        this.historicoRepository = historicoRepository;
        this.historicoImportService = historicoImportService;
    }

    @GetMapping("/{id}/historico")
    public List<JogadorHistorico> historico(@PathVariable Long id) {
        return historicoRepository.findByJogadorIdOrderByEdicaoAsc(id);
    }

    @PostMapping("/historico/importar")
    public Map<String, Object> importar() {
        String resultado = historicoImportService.importar();
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("mensagem", resultado);
        return resposta;
    }

    /** Acrescenta ao histórico a edição atual (FC27 em diante), lida de
     *  dados/players.csv - ver HistoricoImportService.importarEdicaoAtual(). */
    @PostMapping("/historico/importar-edicao-atual")
    public Map<String, Object> importarEdicaoAtual() {
        String resultado = historicoImportService.importarEdicaoAtual();
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("mensagem", resultado);
        return resposta;
    }
}

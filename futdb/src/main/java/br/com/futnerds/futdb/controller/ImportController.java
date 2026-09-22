package br.com.futnerds.futdb.controller;

import br.com.futnerds.futdb.repository.ClubeRepository;
import br.com.futnerds.futdb.service.CsvImportService;
import br.com.futnerds.futdb.service.EscudoImportService;
import br.com.futnerds.futdb.service.FotoImportService;
import br.com.futnerds.futdb.service.UniformeImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final CsvImportService csvImportService;
    private final EscudoImportService escudoImportService;
    private final UniformeImportService uniformeImportService;
    private final FotoImportService fotoImportService;
    private final ClubeRepository clubeRepository;

    public ImportController(CsvImportService csvImportService, EscudoImportService escudoImportService,
                             UniformeImportService uniformeImportService, FotoImportService fotoImportService,
                             ClubeRepository clubeRepository) {
        this.csvImportService = csvImportService;
        this.escudoImportService = escudoImportService;
        this.uniformeImportService = uniformeImportService;
        this.fotoImportService = fotoImportService;
        this.clubeRepository = clubeRepository;
    }

    @PostMapping("/csv")
    public Map<String, String> csv() {
        csvImportService.importar();
        return Map.of("mensagem", "Importacao concluida");
    }

    @GetMapping("/status-detalhes-times")
    public Map<String, Object> statusDetalhesTimes() {
        long pendentesDetalhes = clubeRepository.countByIdTheSportsDbIsNullOrEstadioIsNull();
        long pendentesUniforme = clubeRepository.countPendentesUniforme();
        long totalClubes = clubeRepository.count();
        return Map.of(
                "pendentesDetalhes", pendentesDetalhes,
                "pendentesUniforme", pendentesUniforme,
                "totalClubes", totalClubes
        );
    }

    @PostMapping("/detalhes-times")
    public ResponseEntity<Map<String, Object>> detalhesTimes(@RequestParam(defaultValue = "false") boolean forcar,
                                                               @RequestParam(required = false) List<Long> ids) throws InterruptedException {
        if (ids == null || ids.isEmpty()) {
            long totalClubes = forcar
                    ? clubeRepository.countByIdTheSportsDbIsNullOrEstadioIsNull()
                    : clubeRepository.countByEscudoUrlIsNull();
            escudoImportService.importarEscudosAsync(forcar);
            return ResponseEntity.accepted().body(Map.of("status", "iniciado", "totalClubes", totalClubes));
        }
        String resultado = escudoImportService.importarEscudos(forcar, ids);
        return ResponseEntity.ok(Map.of("mensagem", resultado));
    }

    @PostMapping("/uniformes")
    public ResponseEntity<Map<String, Object>> uniformes(@RequestParam(defaultValue = "false") boolean forcar,
                                                           @RequestParam(required = false) List<Long> ids) throws InterruptedException {
        if (ids == null || ids.isEmpty()) {
            long totalClubes = forcar
                    ? clubeRepository.countByIdTheSportsDbIsNotNull()
                    : clubeRepository.countPendentesUniforme();
            uniformeImportService.importarUniformesAsync(forcar);
            return ResponseEntity.accepted().body(Map.of("status", "iniciado", "totalClubes", totalClubes));
        }
        String resultado = uniformeImportService.importarUniformes(forcar, ids);
        return ResponseEntity.ok(Map.of("mensagem", resultado));
    }

    @PostMapping("/fotos")
    public ResponseEntity<Map<String, Object>> fotos(@RequestParam(defaultValue = "false") boolean forcar) {
        long totalJogadores = fotoImportService.contarPendentes();
        fotoImportService.importarFotosAsync(forcar);
        return ResponseEntity.accepted().body(Map.of("status", "iniciado", "pendentes", totalJogadores));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> tratarErro(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("erro", ex.getMessage()));
    }
}

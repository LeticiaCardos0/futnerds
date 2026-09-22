package br.com.futnerds.futdb.repository;

import br.com.futnerds.futdb.model.JogadorHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JogadorHistoricoRepository extends JpaRepository<JogadorHistorico, Long> {

    List<JogadorHistorico> findByJogadorIdOrderByEdicaoAsc(Long jogadorId);

    Optional<JogadorHistorico> findByJogadorIdAndEdicao(Long jogadorId, Short edicao);
}

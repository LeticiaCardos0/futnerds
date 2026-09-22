package br.com.futnerds.futdb.repository;

import br.com.futnerds.futdb.model.Jogador;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JogadorRepository extends JpaRepository<Jogador, Long> {

    @EntityGraph(attributePaths = {"clube", "nacao"})
    Page<Jogador> findAllByOrderByOverallDesc(Pageable pageable);

    @Query(value = "SELECT * FROM jogador WHERE unaccent(nome_comum) ILIKE unaccent(CONCAT('%', :nomeComum, '%')) ORDER BY overall DESC",
           countQuery = "SELECT count(*) FROM jogador WHERE unaccent(nome_comum) ILIKE unaccent(CONCAT('%', :nomeComum, '%'))",
           nativeQuery = true)
    Page<Jogador> buscarPorNomeComumSemAcento(@Param("nomeComum") String nomeComum, Pageable pageable);

    @EntityGraph(attributePaths = {"clube", "nacao"})
    Page<Jogador> findByPosicaoOrderByOverallDesc(String posicao, Pageable pageable);

    List<Jogador> findByClube_Id(Long clubeId);

    @Query(value = "SELECT AVG(overall), COUNT(*), SUM(preco_pc), AVG(idade) " +
                   "FROM jogador WHERE clube_id = :clubeId", nativeQuery = true)
    List<Object[]> agregarEstatisticasPorClube(@Param("clubeId") Long clubeId);

    /**
     * Quantos jogadores cada nação tem, em uma consulta só (o globo da tela
     * "Nações" precisa do número de todos os países de uma vez).
     * Cada linha vem como [nacaoId, quantidade].
     */
    @Query("SELECT j.nacao.id, COUNT(j) FROM Jogador j WHERE j.nacao IS NOT NULL GROUP BY j.nacao.id")
    List<Object[]> contarPorNacao();
}

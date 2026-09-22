package br.com.futnerds.futdb.repository;

import br.com.futnerds.futdb.model.Clube;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClubeRepository extends JpaRepository<Clube, Long> {

    long countByLiga_Id(Long ligaId);

    long countByEscudoUrlIsNull();

    long countByIdTheSportsDbIsNullOrEstadioIsNull();

    long countByIdTheSportsDbIsNotNull();

    @Query("""
        SELECT COUNT(c) FROM Clube c
        WHERE c.idTheSportsDb IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM Uniforme u WHERE u.clube.id = c.id)
        """)
    long countPendentesUniforme();

    /** Busca um clube pelo nome, ignorando maiúsculas/minúsculas — usado
     *  pra achar o escudo de um clube que aparece no histórico de carreira
     *  (lá o nome é só texto, sem relação direta com a tabela clube). */
    java.util.Optional<Clube> findFirstByNomeIgnoreCase(String nome);

    @Query(value = """
        SELECT c.id, c.nome, c.escudo_url, l.nome as liga_nome,
               AVG(j.overall) as overall_medio,
               COUNT(j.id) as quantidade_jogadores,
               SUM(j.preco_pc) as valor_elenco,
               AVG(j.idade) as idade_media
        FROM clube c
        LEFT JOIN liga l ON l.id = c.liga_id
        LEFT JOIN nacao n ON n.id = l.nacao_id
        INNER JOIN jogador j ON j.clube_id = c.id
        WHERE (:nome IS NULL OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :nome, '%')))
          AND (:liga IS NULL OR l.nome = :liga)
          AND (:pais IS NULL OR n.nome = :pais)
        GROUP BY c.id, c.nome, c.escudo_url, l.nome
        HAVING COUNT(j.id) > 0
        ORDER BY AVG(j.overall) DESC
        LIMIT :size OFFSET :offset
        """, nativeQuery = true)
    List<Object[]> buscarTimesPaginado(@Param("nome") String nome, @Param("liga") String liga, @Param("pais") String pais, @Param("size") int size, @Param("offset") int offset);

    @Query(value = """
        SELECT COUNT(DISTINCT c.id)
        FROM clube c
        LEFT JOIN liga l ON l.id = c.liga_id
        LEFT JOIN nacao n ON n.id = l.nacao_id
        INNER JOIN jogador j ON j.clube_id = c.id
        WHERE (:nome IS NULL OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :nome, '%')))
          AND (:liga IS NULL OR l.nome = :liga)
          AND (:pais IS NULL OR n.nome = :pais)
        """, nativeQuery = true)
    long contarTimes(@Param("nome") String nome, @Param("liga") String liga, @Param("pais") String pais);
}

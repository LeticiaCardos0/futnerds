package br.com.futnerds.futdb.repository;

import br.com.futnerds.futdb.model.Nacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NacaoRepository extends JpaRepository<Nacao, Long> {
}

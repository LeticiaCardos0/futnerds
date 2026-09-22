package br.com.futnerds.futdb.repository;

import br.com.futnerds.futdb.model.Liga;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LigaRepository extends JpaRepository<Liga, Long> {

    List<Liga> findByNacao_Id(Long nacaoId);
}

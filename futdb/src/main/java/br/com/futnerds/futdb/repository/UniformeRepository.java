package br.com.futnerds.futdb.repository;

import br.com.futnerds.futdb.model.Uniforme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UniformeRepository extends JpaRepository<Uniforme, Long> {

    List<Uniforme> findByClube_Id(Long clubeId);

    boolean existsByClube_Id(Long clubeId);
}

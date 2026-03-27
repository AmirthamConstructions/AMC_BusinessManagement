package com.amc.backend.repository;

import com.amc.backend.model.Dimension;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DimensionRepository extends MongoRepository<Dimension, String> {
    Optional<Dimension> findByName(String name);
    boolean existsByName(String name);
}

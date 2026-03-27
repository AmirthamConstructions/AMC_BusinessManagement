package com.amc.backend.repository;

import com.amc.backend.model.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MaterialRepository extends MongoRepository<Material, String> {
    Page<Material> findBySiteId(String siteId, Pageable pageable);
    List<Material> findByDateBetween(LocalDate startDate, LocalDate endDate);
    Page<Material> findByShopName(String shopName, Pageable pageable);
    Page<Material> findByItemNameContainingIgnoreCase(String itemName, Pageable pageable);
}

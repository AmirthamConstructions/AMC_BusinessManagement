package com.amc.backend.repository;

import com.amc.backend.model.StockMovement;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockMovementRepository extends MongoRepository<StockMovement, String> {

    Optional<StockMovement> findByMovementId(String movementId);

    List<StockMovement> findByInventoryItemId(String inventoryItemId);

    List<StockMovement> findByInventoryItemIdOrderByDateDesc(String inventoryItemId);

    List<StockMovement> findBySiteName(String siteName);

    List<StockMovement> findByType(String type);

    List<StockMovement> findByDateBetween(LocalDate startDate, LocalDate endDate);

    List<StockMovement> findByReferenceNo(String referenceNo);
}

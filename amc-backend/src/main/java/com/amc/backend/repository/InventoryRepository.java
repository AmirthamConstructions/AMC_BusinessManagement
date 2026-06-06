package com.amc.backend.repository;

import com.amc.backend.model.InventoryItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends MongoRepository<InventoryItem, String> {

    Optional<InventoryItem> findByItemCode(String itemCode);

    Optional<InventoryItem> findByItemName(String itemName);

    List<InventoryItem> findByCategory(String category);

    List<InventoryItem> findBySiteName(String siteName);

    List<InventoryItem> findByStorageLocation(String storageLocation);

    List<InventoryItem> findByIsActive(Boolean isActive);

    List<InventoryItem> findByCategoryAndIsActive(String category, Boolean isActive);
}

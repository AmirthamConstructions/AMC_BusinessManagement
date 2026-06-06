package com.amc.backend.repository;

import com.amc.backend.model.PriceListItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PriceListItemRepository extends MongoRepository<PriceListItem, String> {
    Optional<PriceListItem> findByItemNameIgnoreCase(String itemName);
    List<PriceListItem> findByCategory(String category);
    boolean existsByItemNameIgnoreCase(String itemName);
}

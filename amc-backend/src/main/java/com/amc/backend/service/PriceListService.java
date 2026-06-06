package com.amc.backend.service;

import com.amc.backend.exception.DuplicateResourceException;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.PriceListItem;
import com.amc.backend.repository.PriceListItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PriceListService {

    private final PriceListItemRepository priceListItemRepository;

    public List<PriceListItem> findAll() {
        return priceListItemRepository.findAll();
    }

    public PriceListItem findById(String id) {
        return priceListItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PriceListItem", "id", id));
    }

    public List<PriceListItem> findByCategory(String category) {
        return priceListItemRepository.findByCategory(category);
    }

    public PriceListItem create(PriceListItem item) {
        if (priceListItemRepository.existsByItemNameIgnoreCase(item.getItemName())) {
            throw new DuplicateResourceException("PriceListItem", "itemName", item.getItemName());
        }
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());
        return priceListItemRepository.save(item);
    }

    public PriceListItem update(String id, PriceListItem item) {
        PriceListItem existing = findById(id);
        existing.setItemName(item.getItemName());
        existing.setCategory(item.getCategory());
        existing.setExpectedRate(item.getExpectedRate());
        existing.setMinRate(item.getMinRate());
        existing.setMaxRate(item.getMaxRate());
        existing.setUnit(item.getUnit());
        existing.setSupplier(item.getSupplier());
        existing.setNotes(item.getNotes());
        existing.setUpdatedAt(LocalDateTime.now());
        return priceListItemRepository.save(existing);
    }

    public void delete(String id) {
        if (!priceListItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("PriceListItem", "id", id);
        }
        priceListItemRepository.deleteById(id);
    }
}

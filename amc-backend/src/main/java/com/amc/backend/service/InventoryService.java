package com.amc.backend.service;

import com.amc.backend.dto.StockInRequest;
import com.amc.backend.dto.StockOutRequest;
import com.amc.backend.dto.StockTransferRequest;
import com.amc.backend.exception.DuplicateResourceException;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.InventoryItem;
import com.amc.backend.model.StockMovement;
import com.amc.backend.repository.InventoryRepository;
import com.amc.backend.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;

    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findAll();
    }

    public InventoryItem getItemById(String id) {
        return inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));
    }

    public InventoryItem getItemByCode(String itemCode) {
        return inventoryRepository.findByItemCode(itemCode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with code: " + itemCode));
    }

    public List<InventoryItem> getItemsByCategory(String category) {
        return inventoryRepository.findByCategory(category);
    }

    public List<InventoryItem> getLowStockItems() {
        return inventoryRepository.findAll().stream()
                .filter(item -> item.getCurrentStock() < item.getMinimumStock())
                .collect(Collectors.toList());
    }

    public List<InventoryItem> getItemsBySite(String siteName) {
        return inventoryRepository.findBySiteName(siteName);
    }

    public List<InventoryItem> getItemsByLocation(String storageLocation) {
        return inventoryRepository.findByStorageLocation(storageLocation);
    }

    public List<StockMovement> getItemMovements(String inventoryItemId) {
        return stockMovementRepository.findByInventoryItemIdOrderByDateDesc(inventoryItemId);
    }

    @Transactional
    public InventoryItem createItem(InventoryItem item) {
        if (inventoryRepository.findByItemCode(item.getItemCode()).isPresent()) {
            throw new DuplicateResourceException("Inventory item already exists with code: " + item.getItemCode());
        }

        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());
        
        if (item.getCurrentStock() == null) {
            item.setCurrentStock(0.0);
        }
        if (item.getMinimumStock() == null) {
            item.setMinimumStock(0.0);
        }
        if (item.getIsActive() == null) {
            item.setIsActive(true);
        }

        return inventoryRepository.save(item);
    }

    @Transactional
    public InventoryItem updateItem(String id, InventoryItem item) {
        InventoryItem existingItem = getItemById(id);

        if (!existingItem.getItemCode().equals(item.getItemCode()) &&
                inventoryRepository.findByItemCode(item.getItemCode()).isPresent()) {
            throw new DuplicateResourceException("Inventory item already exists with code: " + item.getItemCode());
        }

        existingItem.setItemCode(item.getItemCode());
        existingItem.setItemName(item.getItemName());
        existingItem.setCategory(item.getCategory());
        existingItem.setUnit(item.getUnit());
        existingItem.setMinimumStock(item.getMinimumStock());
        existingItem.setStorageLocation(item.getStorageLocation());
        existingItem.setSiteName(item.getSiteName());
        existingItem.setIsActive(item.getIsActive());
        existingItem.setUpdatedAt(LocalDateTime.now());

        return inventoryRepository.save(existingItem);
    }

    @Transactional
    public void deleteItem(String id) {
        InventoryItem item = getItemById(id);
        inventoryRepository.delete(item);
    }

    @Transactional
    public StockMovement stockIn(StockInRequest request) {
        // Find or create inventory item
        InventoryItem item = inventoryRepository.findByItemCode(request.getItemCode())
                .orElseGet(() -> {
                    // Auto-create inventory item
                    InventoryItem newItem = InventoryItem.builder()
                            .itemCode(request.getItemCode())
                            .itemName(request.getItemName())
                            .category(request.getCategory())
                            .unit(request.getUnit())
                            .currentStock(0.0)
                            .minimumStock(request.getMinimumStock() != null ? request.getMinimumStock() : 0.0)
                            .storageLocation(request.getStorageLocation())
                            .siteName(request.getSiteName())
                            .isActive(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return inventoryRepository.save(newItem);
                });

        // Calculate new stock and average rate
        Double currentStock = item.getCurrentStock();
        Double currentAvgRate = item.getAverageRate() != null ? item.getAverageRate() : 0.0;
        Double newQuantity = request.getQuantity();
        Double newRate = request.getRate();
        
        Double newStock = currentStock + newQuantity;
        Double totalValue = (currentStock * currentAvgRate) + (newQuantity * newRate);
        Double newAvgRate = newStock > 0 ? totalValue / newStock : newRate;

        // Update inventory item
        item.setCurrentStock(newStock);
        item.setAverageRate(newAvgRate);
        item.setLastPurchaseRate(newRate);
        item.setUpdatedAt(LocalDateTime.now());
        inventoryRepository.save(item);

        // Create stock movement
        String movementId = generateMovementId(request.getDate());
        StockMovement movement = StockMovement.builder()
                .movementId(movementId)
                .inventoryItemId(item.getId())
                .itemName(item.getItemName())
                .type("IN")
                .quantity(newQuantity)
                .rate(newRate)
                .amount(newQuantity * newRate)
                .toLocation(request.getStorageLocation())
                .siteName(request.getSiteName())
                .referenceNo(request.getReferenceNo())
                .date(request.getDate())
                .notes(request.getNotes())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return stockMovementRepository.save(movement);
    }

    @Transactional
    public StockMovement stockOut(StockOutRequest request) {
        InventoryItem item = getItemById(request.getInventoryItemId());

        // Check sufficient stock
        if (item.getCurrentStock() < request.getQuantity()) {
            throw new IllegalArgumentException("Insufficient stock. Available: " + item.getCurrentStock());
        }

        // Update inventory item
        item.setCurrentStock(item.getCurrentStock() - request.getQuantity());
        item.setUpdatedAt(LocalDateTime.now());
        inventoryRepository.save(item);

        // Create stock movement
        String movementId = generateMovementId(request.getDate());
        StockMovement movement = StockMovement.builder()
                .movementId(movementId)
                .inventoryItemId(item.getId())
                .itemName(item.getItemName())
                .type("OUT")
                .quantity(request.getQuantity())
                .rate(item.getAverageRate())
                .amount(request.getQuantity() * (item.getAverageRate() != null ? item.getAverageRate() : 0.0))
                .fromLocation(item.getStorageLocation())
                .siteName(request.getSiteName())
                .referenceNo(request.getReferenceNo())
                .date(request.getDate())
                .notes(request.getNotes())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return stockMovementRepository.save(movement);
    }

    @Transactional
    public StockMovement transferStock(StockTransferRequest request) {
        InventoryItem item = getItemById(request.getInventoryItemId());

        // Check sufficient stock
        if (item.getCurrentStock() < request.getQuantity()) {
            throw new IllegalArgumentException("Insufficient stock. Available: " + item.getCurrentStock());
        }

        // Update storage location if transferring to a different location
        item.setStorageLocation(request.getToLocation());
        item.setUpdatedAt(LocalDateTime.now());
        inventoryRepository.save(item);

        // Create stock movement
        String movementId = generateMovementId(request.getDate());
        StockMovement movement = StockMovement.builder()
                .movementId(movementId)
                .inventoryItemId(item.getId())
                .itemName(item.getItemName())
                .type("TRANSFER")
                .quantity(request.getQuantity())
                .rate(item.getAverageRate())
                .amount(request.getQuantity() * (item.getAverageRate() != null ? item.getAverageRate() : 0.0))
                .fromLocation(request.getFromLocation())
                .toLocation(request.getToLocation())
                .siteName(request.getSiteName())
                .referenceNo(request.getReferenceNo())
                .date(request.getDate())
                .notes(request.getNotes())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return stockMovementRepository.save(movement);
    }

    private String generateMovementId(LocalDate date) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
        String dateStr = date.format(formatter);
        
        // Count movements for the day
        LocalDate startOfDay = date;
        LocalDate endOfDay = date.plusDays(1);
        long count = stockMovementRepository.findByDateBetween(startOfDay, endOfDay).size();
        
        return String.format("SM-%s-%03d", dateStr, count + 1);
    }

    @Transactional
    public void linkMaterialToInventory(String itemName, Double quantity, Double rate, String siteName, String billNo, LocalDate date) {
        try {
            // Find or create inventory item by name
            InventoryItem item = inventoryRepository.findByItemName(itemName)
                    .orElseGet(() -> {
                        // Auto-create item with auto-generated code
                        String itemCode = generateItemCode(itemName);
                        String category = inferCategory(itemName);
                        
                        InventoryItem newItem = InventoryItem.builder()
                                .itemCode(itemCode)
                                .itemName(itemName)
                                .category(category)
                                .unit("Nos") // Default unit
                                .currentStock(0.0)
                                .minimumStock(0.0)
                                .storageLocation(siteName)
                                .siteName(siteName)
                                .isActive(true)
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();
                        return inventoryRepository.save(newItem);
                    });

            // Calculate new stock and average rate
            Double currentStock = item.getCurrentStock();
            Double currentAvgRate = item.getAverageRate() != null ? item.getAverageRate() : 0.0;
            
            Double newStock = currentStock + quantity;
            Double totalValue = (currentStock * currentAvgRate) + (quantity * rate);
            Double newAvgRate = newStock > 0 ? totalValue / newStock : rate;

            // Update inventory item
            item.setCurrentStock(newStock);
            item.setAverageRate(newAvgRate);
            item.setLastPurchaseRate(rate);
            item.setUpdatedAt(LocalDateTime.now());
            inventoryRepository.save(item);

            // Create stock movement
            String movementId = generateMovementId(date);
            StockMovement movement = StockMovement.builder()
                    .movementId(movementId)
                    .inventoryItemId(item.getId())
                    .itemName(itemName)
                    .type("IN")
                    .quantity(quantity)
                    .rate(rate)
                    .amount(quantity * rate)
                    .toLocation(siteName)
                    .siteName(siteName)
                    .referenceNo(billNo)
                    .date(date)
                    .notes("Auto-linked from Material purchase")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            stockMovementRepository.save(movement);
            
            log.info("Linked material to inventory: {} - {} units", itemName, quantity);
        } catch (Exception e) {
            log.error("Error linking material to inventory: {}", e.getMessage());
        }
    }

    private String generateItemCode(String itemName) {
        String category = inferCategory(itemName);
        String prefix = category.substring(0, Math.min(4, category.length())).toUpperCase();
        
        long count = inventoryRepository.count();
        return String.format("INV-%s-%03d", prefix, count + 1);
    }

    private String inferCategory(String itemName) {
        String lower = itemName.toLowerCase();
        
        if (lower.contains("wire") || lower.contains("cable") || lower.contains("switch") || 
            lower.contains("board") || lower.contains("light")) {
            return "Electrical";
        } else if (lower.contains("pipe") || lower.contains("tap") || lower.contains("tank")) {
            return "Plumbing";
        } else if (lower.contains("cement") || lower.contains("concrete")) {
            return "Cement";
        } else if (lower.contains("sand") || lower.contains("m-sand")) {
            return "M-Sand";
        } else if (lower.contains("tile")) {
            return "Tiles";
        } else if (lower.contains("paint")) {
            return "Painting";
        }
        
        return "Civil";
    }
}

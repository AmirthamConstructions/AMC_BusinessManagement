package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.dto.StockInRequest;
import com.amc.backend.dto.StockOutRequest;
import com.amc.backend.dto.StockTransferRequest;
import com.amc.backend.model.InventoryItem;
import com.amc.backend.model.StockMovement;
import com.amc.backend.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryItem>>> getAllItems(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String siteName,
            @RequestParam(required = false) String storageLocation) {
        
        List<InventoryItem> items;
        
        if (category != null && !category.isEmpty()) {
            items = inventoryService.getItemsByCategory(category);
        } else if (siteName != null && !siteName.isEmpty()) {
            items = inventoryService.getItemsBySite(siteName);
        } else if (storageLocation != null && !storageLocation.isEmpty()) {
            items = inventoryService.getItemsByLocation(storageLocation);
        } else {
            items = inventoryService.getAllItems();
        }
        
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItem>> getItemById(@PathVariable String id) {
        InventoryItem item = inventoryService.getItemById(id);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @GetMapping("/code/{itemCode}")
    public ResponseEntity<ApiResponse<InventoryItem>> getItemByCode(@PathVariable String itemCode) {
        InventoryItem item = inventoryService.getItemByCode(itemCode);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<InventoryItem>>> getItemsByCategory(@PathVariable String category) {
        List<InventoryItem> items = inventoryService.getItemsByCategory(category);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryItem>>> getLowStockItems() {
        List<InventoryItem> items = inventoryService.getLowStockItems();
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<ApiResponse<List<StockMovement>>> getItemMovements(@PathVariable String id) {
        List<StockMovement> movements = inventoryService.getItemMovements(id);
        return ResponseEntity.ok(ApiResponse.ok(movements));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InventoryItem>> createItem(@Valid @RequestBody InventoryItem item) {
        InventoryItem createdItem = inventoryService.createItem(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(createdItem));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItem>> updateItem(
            @PathVariable String id,
            @Valid @RequestBody InventoryItem item) {
        InventoryItem updatedItem = inventoryService.updateItem(id, item);
        return ResponseEntity.ok(ApiResponse.ok(updatedItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable String id) {
        inventoryService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/stock-in")
    public ResponseEntity<ApiResponse<StockMovement>> stockIn(@Valid @RequestBody StockInRequest request) {
        StockMovement movement = inventoryService.stockIn(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(movement));
    }

    @PostMapping("/stock-out")
    public ResponseEntity<ApiResponse<StockMovement>> stockOut(@Valid @RequestBody StockOutRequest request) {
        StockMovement movement = inventoryService.stockOut(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(movement));
    }

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse<StockMovement>> transferStock(@Valid @RequestBody StockTransferRequest request) {
        StockMovement movement = inventoryService.transferStock(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(movement));
    }
}

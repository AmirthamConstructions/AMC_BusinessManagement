package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for GET /api/materials/inventory-summary — R4.5
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialInventorySummary {

    private List<InventoryRow> items;
    private int totalDistinctItems;
    private double grandTotalAmount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryRow {
        private String itemName;
        private String category;       // derived from itemName heuristic
        private double totalQuantity;
        private double totalAmount;
        private double avgRate;
        private double lastRate;
        private int sitesUsedCount;
        private int purchaseCount;
        private String lastPurchaseDate;
    }
}

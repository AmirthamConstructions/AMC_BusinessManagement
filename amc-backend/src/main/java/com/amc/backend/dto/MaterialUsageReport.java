package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for GET /api/materials/usage — R4.2
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialUsageReport {

    private String siteId;
    private String siteName;
    private double totalMaterialCost;
    private int distinctItemCount;
    private List<ItemUsage> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemUsage {
        private String itemName;
        private double totalQuantity;
        private double totalAmount;
        private double avgRate;
        private int purchaseCount;
        private String lastPurchaseDate;
    }
}

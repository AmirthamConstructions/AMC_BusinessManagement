package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for GET /api/materials/rate-analysis — R4.1
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialRateAnalysis {

    private List<ItemRateInfo> items;
    private int totalDistinctItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemRateInfo {
        private String itemName;
        private double minRate;
        private double maxRate;
        private double avgRate;
        private double lastRate;
        private String lastPurchaseDate;
        private String trend;           // UP, DOWN, STABLE
        private int purchaseCount;
        private double totalQuantity;
        private double totalAmount;
        private List<RatePoint> rateHistory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RatePoint {
        private String date;
        private double rate;
        private double quantity;
        private String siteName;
    }
}

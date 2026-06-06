package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for GET /api/materials/roi — R4.3
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialRoiAnalysis {

    private String siteId;
    private String siteName;
    private double quotation;
    private double materialCost;
    private double labourCost;
    private double otherCost;
    private double totalCost;
    private double profit;
    private double roi;           // (quotation - totalCost) / totalCost * 100
    private double breakeven;     // totalCost (the point where income = cost)
    private boolean isProfitable;
}

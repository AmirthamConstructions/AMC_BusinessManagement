package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SitesOverview {

    private int totalSites;
    private int activeSites;
    private int inactiveSites;
    private int mainCompanySites;
    private int gstCompanySites;
    private Double totalQuotation;
    private Double totalExpenses;
    private Double totalMaterialCost;
    private Double totalLabourCost;
    private Double overallProfit;

    // Per-site comparison rows (for bar chart: quotation vs actual)
    private List<SiteComparisonRow> siteComparisons;

    // Top 5 most profitable
    private List<SiteComparisonRow> topProfitable;

    // Top 5 most expensive
    private List<SiteComparisonRow> topExpensive;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SiteComparisonRow {
        private String siteId;
        private String siteName;
        private String company;
        private String status;
        private Double quotationAmount;
        private Double totalExpense;
        private Double materialCost;
        private Double labourCost;
        private Double profit;
        private Double roi;
    }
}

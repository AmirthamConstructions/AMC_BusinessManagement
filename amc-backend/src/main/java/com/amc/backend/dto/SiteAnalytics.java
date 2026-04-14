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
public class SiteAnalytics {

    // ── Site info ──
    private String siteId;
    private String siteName;
    private String clientName;
    private String company;
    private String address;
    private Double quotationAmount;
    private String dateOfStart;
    private String dueDate;
    private Boolean isActive;

    // ── Financial summary ──
    private Double totalCredits;
    private Double totalDebits;
    private Double materialCost;
    private Double labourCost;
    private Double otherCost;
    private Double profit;         // credits - debits
    private Double roi;            // (quotation - totalDebits) / totalDebits * 100

    // ── Counts ──
    private int transactionCount;
    private int materialEntryCount;
    private int labourEntryCount;

    // ── Monthly trends (for charts) ──
    private List<MonthlyAmount> monthlyExpenses;
    private List<MonthlyAmount> monthlyCredits;

    // ── Expense breakdown (for pie chart) ──
    private List<CategoryAmount> expenseBreakdown;

    // ── Top material items ──
    private List<MaterialSummaryRow> topMaterials;

    // ── Labour entries ──
    private List<LabourEntry> labourEntries;

    // ── All charges (unified view) ──
    private List<ChargeRow> allCharges;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyAmount {
        private String month;   // "2026-01", "2026-02", etc.
        private Double amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryAmount {
        private String category;  // "Material", "Labour", "Other"
        private Double amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaterialSummaryRow {
        private String itemName;
        private String totalQuantity;
        private Double totalAmount;
        private Double avgRate;
        private int entryCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LabourEntry {
        private String date;
        private String description;
        private String party;
        private Double amount;
        private String nature;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChargeRow {
        private String date;
        private String type;        // "Transaction" or "Material"
        private String description;
        private Double amount;
        private String party;
    }
}

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
public class GstReconciliation {

    // Outward (Sales) summary
    private int outwardInvoiceCount;
    private Double outwardTaxableValue;
    private Double outwardCgst;
    private Double outwardSgst;
    private Double outwardTotalTax;
    private Double outwardInvoiceValue;

    // Inward (Purchase) summary
    private int inwardInvoiceCount;
    private Double inwardTaxableValue;
    private Double inwardCgst;
    private Double inwardSgst;
    private Double inwardTotalTax;
    private Double inwardPurchaseValue;

    // Net payable
    private Double outputTax;
    private Double inputTaxCredit;
    private Double netGstPayable;

    // Period info
    private String year;
    private String month;

    // Detail lists for the table view
    private List<OutwardSummaryRow> outwardDetails;
    private List<InwardSummaryRow> inwardDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OutwardSummaryRow {
        private String invoiceNo;
        private String invoiceDate;
        private String customerName;
        private String customerGSTIN;
        private Double taxableValue;
        private Double cgst;
        private Double sgst;
        private Double invoiceValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InwardSummaryRow {
        private String purchaseBillNo;
        private String invoiceDate;
        private String companyName;
        private String companyGSTIN;
        private Double taxableValue;
        private Double cgst;
        private Double sgst;
        private Double purchaseBillValue;
    }
}

package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for invoice dashboard KPIs — R1.5
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceKpi {

    // Current month
    private int invoicesThisMonth;
    private double billedThisMonth;

    // Current financial year
    private int invoicesThisFY;
    private double billedThisFY;

    // By status (all time, non-template)
    private int totalDraft;
    private int totalSent;
    private int totalPaid;
    private int totalCancelled;

    // Amounts
    private double totalBilled;       // grandTotal of all non-cancelled invoices
    private double totalCollected;    // grandTotal of PAID invoices
    private double totalOutstanding;  // grandTotal of DRAFT + SENT invoices
}

package com.amc.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import javax.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "invoices")
public class Invoice {

    @Id
    private String id;

    @Indexed(unique = true)
    @NotBlank(message = "Invoice number is required")
    private String invoiceNo;

    private LocalDate invoiceDate;

    // Customer info
    private String customerName;
    private String customerAddress;
    private String customerState;
    private String customerPincode;
    private String customerGSTIN;

    // Work info
    private String nameOfWork;

    // Line items
    private List<InvoiceLineItem> lineItems;

    // Amounts
    private Double subTotal;
    private Double cgstPercent;
    private Double cgstAmount;
    private Double sgstPercent;
    private Double sgstAmount;
    private Double igstPercent;
    private Double igstAmount;
    private Double roundOff;
    private Double grandTotal;
    private String amountInWords;

    // Status
    private String status; // DRAFT, SENT, PAID, CANCELLED

    // R1.4: Template support
    @Builder.Default
    private Boolean isTemplate = false;
    private String templateName;

    private String notes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceLineItem {
        private Integer sNo;
        private String description;
        private Double amount;
    }
}

package com.amc.backend.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transactions")
public class Transaction {

    @Id
    private String id;

    @Indexed(unique = true)
    private String transactionId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotBlank(message = "Company is required")
    private String company; // Main, GST

    private String siteId;

    private String siteName;

    @NotBlank(message = "Type is required")
    private String type; // Credit, Debit

    private String nature;

    private String description;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Double amount;

    private String party;

    private String invoiceNo;

    private String gstNo;

    private String companyAccount;

    private String modeOfPayment;

    private String notes;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

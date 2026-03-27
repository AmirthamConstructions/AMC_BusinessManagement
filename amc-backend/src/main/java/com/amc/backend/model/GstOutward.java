package com.amc.backend.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "gst_outward")
public class GstOutward {

    @Id
    private String id;

    private String year;

    private String invoiceMonth;

    private String filingMonth;

    @NotBlank(message = "Invoice number is required")
    private String invoiceNo;

    private LocalDate invoiceDate;

    private String customerName;

    private String customerGSTIN;

    private String description;

    private Double taxableValue;

    private Double cgstPercent;

    private Double cgstAmount;

    private Double sgstPercent;

    private Double sgstAmount;

    private Double invoiceValue;

    private String placeOfSupply;

    private String inputCreditEligible;

    private String remarks;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

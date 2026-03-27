package com.amc.backend.model;

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
@Document(collection = "gst_inward")
public class GstInward {

    @Id
    private String id;

    private String purchaseBillNo;

    private LocalDate invoiceDate;

    private String companyName;

    private String companyGSTIN;

    private String description;

    private Double taxableValue;

    private Double cgstAmount;

    private Double sgstAmount;

    private Double purchaseBillValue;

    private String inputCreditEligible;

    private String remarks;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

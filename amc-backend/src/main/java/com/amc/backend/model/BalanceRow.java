package com.amc.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "balance_sheet")
public class BalanceRow {

    @Id
    private String id;

    private Integer sNo;

    private String liability;

    private Double liabilityAmount;

    private String asset;

    private Double assetAmount;

    private String company; // Main, GST — optional filter

    private String financialYear;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

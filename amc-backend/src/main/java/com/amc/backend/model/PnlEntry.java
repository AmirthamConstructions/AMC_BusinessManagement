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
@Document(collection = "profit_and_loss")
public class PnlEntry {

    @Id
    private String id;

    private LocalDate date;

    private String income;

    private Double incomeAmount;

    private String expense;

    private Double expenseAmount;

    private String company; // Main, GST — optional filter

    private String financialYear;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

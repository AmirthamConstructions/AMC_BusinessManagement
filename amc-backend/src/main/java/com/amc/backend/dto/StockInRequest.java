package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockInRequest {

    @NotBlank(message = "Item code is required")
    private String itemCode;

    private String itemName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Unit is required")
    private String unit;

    @NotNull(message = "Quantity is required")
    private Double quantity;

    @NotNull(message = "Rate is required")
    private Double rate;

    private String storageLocation;

    private String siteName;

    private String referenceNo;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String notes;

    private Double minimumStock;
}

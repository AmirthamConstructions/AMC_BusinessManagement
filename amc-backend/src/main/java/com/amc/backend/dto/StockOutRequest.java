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
public class StockOutRequest {

    @NotBlank(message = "Inventory item ID is required")
    private String inventoryItemId;

    @NotNull(message = "Quantity is required")
    private Double quantity;

    @NotBlank(message = "Site name is required")
    private String siteName;

    private String referenceNo;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String notes;
}

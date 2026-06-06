package com.amc.backend.model;

import javax.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "stock_movements")
public class StockMovement {

    @Id
    private String id;

    @Indexed(unique = true)
    @NotBlank(message = "Movement ID is required")
    private String movementId;

    @NotBlank(message = "Inventory item ID is required")
    private String inventoryItemId;

    private String itemName;

    @NotBlank(message = "Type is required")
    private String type; // IN, OUT, TRANSFER

    @NotNull(message = "Quantity is required")
    private Double quantity;

    private Double rate;

    private Double amount;

    private String fromLocation;

    private String toLocation;

    private String siteName;

    private String referenceNo;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String notes;

    private String createdBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

package com.amc.backend.model;

import javax.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "inventory")
public class InventoryItem {

    @Id
    private String id;

    @Indexed(unique = true)
    @NotBlank(message = "Item code is required")
    private String itemCode;

    @NotBlank(message = "Item name is required")
    private String itemName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Unit is required")
    private String unit;

    @Builder.Default
    private Double currentStock = 0.0;

    @Builder.Default
    private Double minimumStock = 0.0;

    private String storageLocation;

    private String siteName;

    private Double lastPurchaseRate;

    private Double averageRate;

    @Builder.Default
    private Boolean isActive = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

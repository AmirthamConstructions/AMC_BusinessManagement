package com.amc.backend.model;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Master Price List / Rate Card — R4.4
 * Maintains expected rate ranges per item for overpayment detection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "price_list")
public class PriceListItem {

    @Id
    private String id;

    @Indexed(unique = true)
    @NotBlank(message = "Item name is required")
    private String itemName;

    private String category;       // Electrical, Plumbing, Civil, M-Sand, Cement, Painting, Tiles, Other

    @NotNull(message = "Expected rate is required")
    private Double expectedRate;

    private Double minRate;

    private Double maxRate;

    private String unit;           // Nos, Kg, Bags, Sqft, Litre, Bundle, Truck, CFT

    private String supplier;

    private String notes;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

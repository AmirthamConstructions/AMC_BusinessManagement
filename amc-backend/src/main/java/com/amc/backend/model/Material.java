package com.amc.backend.model;

import javax.validation.constraints.NotBlank;
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
@Document(collection = "materials")
public class Material {

    @Id
    private String id;

    private LocalDate date;

    private String billNo;

    @NotBlank(message = "Item name is required")
    private String itemName;

    private String quantity;

    private Double rate;

    private Double amount;

    private String siteId;

    private String siteName;

    private String shopName;

    private String notes;

    private String notes2;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

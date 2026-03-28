package com.amc.backend.model;

import javax.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sites")
public class Site {

    @Id
    private String id;

    @Indexed(unique = true)
    private String siteId;

    @NotBlank(message = "Site name is required")
    private String name;

    private String clientName;

    private String address;

    private String contactNumber;

    @NotBlank(message = "Company is required")
    private String company; // Main, GST

    private String expenseHead;

    private String incomeHead;

    private String paymentMode;

    private String companyAccount;

    @Builder.Default
    private Boolean isActive = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

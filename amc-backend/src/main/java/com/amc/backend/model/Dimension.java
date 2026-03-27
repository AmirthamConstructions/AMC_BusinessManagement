package com.amc.backend.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "dimensions")
public class Dimension {

    @Id
    private String id;

    @NotBlank(message = "Dimension name is required")
    @Indexed(unique = true)
    private String name;

    private List<String> values;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

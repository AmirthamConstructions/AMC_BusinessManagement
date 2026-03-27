package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationMeta {
    private long total;
    private int page;
    private int perPage;
    private int totalPages;
}

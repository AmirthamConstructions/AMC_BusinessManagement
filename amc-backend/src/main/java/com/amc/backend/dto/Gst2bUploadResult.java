package com.amc.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Gst2bUploadResult {

    private int totalRows;
    private int importedCount;
    private int skippedCount;
    private int errorCount;
    private List<String> skippedReasons;
    private List<String> errorMessages;
}

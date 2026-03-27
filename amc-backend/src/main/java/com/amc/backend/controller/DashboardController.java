package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardService.DashboardData>> getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        // Default to current financial year if no dates given
        if (startDate == null) {
            LocalDate now = LocalDate.now();
            startDate = now.getMonthValue() >= 4
                    ? LocalDate.of(now.getYear(), 4, 1)
                    : LocalDate.of(now.getYear() - 1, 4, 1);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        DashboardService.DashboardData data = dashboardService.getDashboardData(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}

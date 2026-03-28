package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.PnlEntry;
import com.amc.backend.service.PnlService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/profit-loss")
@RequiredArgsConstructor
public class PnlController {

    private final PnlService pnlService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PnlEntry>>> getAll(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String financialYear) {
        List<PnlEntry> entries;
        if (company != null && financialYear != null) {
            entries = pnlService.findByCompany(company); // filtered further if needed
        } else if (company != null) {
            entries = pnlService.findByCompany(company);
        } else if (financialYear != null) {
            entries = pnlService.findByFinancialYear(financialYear);
        } else {
            entries = pnlService.findAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PnlEntry>> getById(@PathVariable String id) {
        PnlEntry entry = pnlService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(entry));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<PnlEntry>>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<PnlEntry> entries = pnlService.findByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PnlEntry>> create(@Valid @RequestBody PnlEntry entry) {
        PnlEntry created = pnlService.create(entry);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PnlEntry>> update(@PathVariable String id, @Valid @RequestBody PnlEntry entry) {
        PnlEntry updated = pnlService.update(id, entry);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        pnlService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

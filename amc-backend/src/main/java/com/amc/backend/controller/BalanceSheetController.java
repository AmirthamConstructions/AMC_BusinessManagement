package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.BalanceRow;
import com.amc.backend.service.BalanceSheetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/balance-sheet")
@RequiredArgsConstructor
public class BalanceSheetController {

    private final BalanceSheetService balanceSheetService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BalanceRow>>> getAll(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String financialYear) {
        List<BalanceRow> rows;
        if (company != null && financialYear != null) {
            rows = balanceSheetService.findByCompanyAndFinancialYear(company, financialYear);
        } else if (company != null) {
            rows = balanceSheetService.findByCompany(company);
        } else if (financialYear != null) {
            rows = balanceSheetService.findByFinancialYear(financialYear);
        } else {
            rows = balanceSheetService.findAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BalanceRow>> getById(@PathVariable String id) {
        BalanceRow row = balanceSheetService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(row));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BalanceRow>> create(@Valid @RequestBody BalanceRow balanceRow) {
        BalanceRow created = balanceSheetService.create(balanceRow);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BalanceRow>> update(@PathVariable String id, @Valid @RequestBody BalanceRow balanceRow) {
        BalanceRow updated = balanceSheetService.update(id, balanceRow);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        balanceSheetService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
